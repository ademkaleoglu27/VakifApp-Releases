import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useQuranStore } from '../store/useQuranStore';

const REPO_OWNER = 'ademkaleoglu27';
const REPO_NAME = 'VakifApp-Releases';
const MANIFEST_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/quran-pack/manifest.json`;
const DOWNLOAD_TIMEOUT = 45000; // 45s timeout
const MAX_RETRIES = 3;

export interface QuranAsset {
    id: string;
    filename: string;
    sizeBytes: number;
    sha256: string;
    url: string;
    pageFrom?: number;
    pageTo?: number;
}

export interface QuranManifest {
    version: string;
    totalPages: number;
    filePattern: string;
    downloadMode: 'single' | 'multipart';
    cacheBust: string;
    assets: QuranAsset | QuranAsset[];
    updatedAt: string;
}

const QURAN_DIR = FileSystem.documentDirectory + 'quran/';

export const QuranPackService = {
    getPaths(version: string) {
        return {
            active: `${QURAN_DIR}active/${version}/pages/`,
            activeSwap: `${QURAN_DIR}active/${version}/pages_swap/`,
            activeNew: `${QURAN_DIR}active/${version}/pages_new/`,
            staging: `${QURAN_DIR}staging/${version}/`,
            tmp: `${QURAN_DIR}tmp/${version}/`
        };
    },

    async fetchManifest(): Promise<QuranManifest> {
        const response = await this.fetchWithRetry(`${MANIFEST_URL}?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Manifest yüklenemedi (HTTP ${response.status})`);

        const text = await response.text();
        // Remove BOM if present (often added by Windows editors)
        const cleanText = text.replace(/^\uFEFF/, '').trim();

        try {
            const manifest = JSON.parse(cleanText);
            useQuranStore.getState().setTotalPages(manifest.totalPages);
            return manifest;
        } catch (e) {
            console.error("Manifest parse error. Content start:", text.substring(0, 100));
            // Return verbose error
            throw new Error(`JSON Parse error. Header: ${text.substring(0, 50)}...`);
        }
    },

    async fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) return response;
            } catch (e) {
                if (i === retries - 1) throw e;
                await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
            }
        }
        throw new Error('Bağlantı hatası.');
    },

    async checkDiskSpace(requiredBytes: number): Promise<boolean> {
        const freeSpace = await FileSystem.getFreeDiskStorageAsync();
        return freeSpace > requiredBytes;
    },

    async verifyHash(filePath: string, expectedHash: string): Promise<boolean> {
        const cleanPath = filePath.replace('file://', '');
        const actualHash = await ReactNativeBlobUtil.fs.hash(cleanPath, 'sha256');
        return actualHash.toLowerCase() === expectedHash.toLowerCase();
    },

    async downloadAndInstall() {
        const store = useQuranStore.getState();
        store.setStatus('DOWNLOADING');
        store.setDownloadProgress(0);
        store.setDetailedStatus('Manifest alınıyor...');

        let currentVersion = store.installedVersion || 'v1';

        try {
            const manifest = await this.fetchManifest();
            currentVersion = manifest.version;
            const paths = this.getPaths(currentVersion);

            const assets = Array.isArray(manifest.assets) ? manifest.assets : [manifest.assets];
            const totalAssets = assets.length;
            const totalSize = assets.reduce((acc, a) => acc + a.sizeBytes, 0);

            // Initial disk check with safety margin for atomicNew full-copy (Need ~3x totalSize)
            const factor = 3;
            const requiredBytes = Math.ceil(totalSize * factor);
            const requiredMB = Math.ceil(requiredBytes / 1024 / 1024);

            if (!(await this.checkDiskSpace(requiredBytes))) {
                throw new Error(`Yetersiz depolama alanı. Lütfen en az ${requiredMB}MB yer açın.`);
            }

            await FileSystem.makeDirectoryAsync(paths.staging, { intermediates: true });
            await FileSystem.makeDirectoryAsync(paths.tmp, { intermediates: true });

            let completedCount = 0;

            for (const asset of assets) {
                if (store.installedParts.includes(asset.id) && store.installedVersion === currentVersion) {
                    completedCount++;
                    continue;
                }

                store.setDetailedStatus(`${asset.id} indiriliyor...`);
                const zipPath = `${paths.tmp}${asset.filename}`;
                const assetStaging = `${paths.staging}${asset.id}/`;
                await FileSystem.makeDirectoryAsync(assetStaging, { intermediates: true });

                console.log(`Starting real download for ${asset.id}`);
                await this.downloadFileWithRetry(
                    asset.url, // No cache bust for binary
                    zipPath,
                    (assetProgress) => {
                        console.log(`Progress: ${assetProgress}`);
                        const totalProgress = (completedCount + assetProgress) / totalAssets;
                        useQuranStore.getState().setDownloadProgress(totalProgress);
                    }
                );

                store.setDetailedStatus(`${asset.id} doğrulanıyor...`);
                if (!(await this.verifyHash(zipPath, asset.sha256))) throw new Error(`${asset.id} HASH hatası`);

                store.setDetailedStatus(`${asset.id} paket açılıyor...`);
                await unzip(zipPath, assetStaging);

                // Pattern & Structural check (Stronger Hardening)
                const foundFiles = await this.getFilesRecursive(assetStaging);
                const webpFiles = foundFiles.filter(f => /^page_\d{3}\.webp$/.test(f));

                // 1. Check for garbage (any file not matching the regex)
                if (foundFiles.length !== webpFiles.length) {
                    throw new Error(`${asset.id} geçersiz dosya yapısı (Beklenmeyen ek dosyalar bulundu)`);
                }

                // 2. Check for missing pages
                const expectedCount = asset.pageTo && asset.pageFrom ? (asset.pageTo - asset.pageFrom + 1) : manifest.totalPages;
                if (webpFiles.length !== expectedCount) {
                    throw new Error(`${asset.id} dosya sayısı hatası (Beklenen: ${expectedCount}, Mevcut: ${webpFiles.length})`);
                }

                // Range validation for multipart
                if (asset.pageFrom && asset.pageTo) {
                    for (let p = asset.pageFrom; p <= asset.pageTo; p++) {
                        const expectedName = `page_${p.toString().padStart(3, '0')}.webp`;
                        if (!webpFiles.includes(expectedName)) throw new Error(`${asset.id} eksik sayfa: ${expectedName}`);
                    }
                }

                store.setDetailedStatus(`${asset.id} kuruluyor...`);
                await this.atomicSyncFromStaging(assetStaging, paths);

                completedCount++;
                store.addInstalledPart(asset.id);
                store.setInstalledVersion(currentVersion);
                store.setDownloadProgress(completedCount / totalAssets);
                if (completedCount === 1 && totalAssets > 1) store.setStatus('PARTIAL');

                await FileSystem.deleteAsync(zipPath, { idempotent: true });
                await FileSystem.deleteAsync(assetStaging, { idempotent: true });
            }

            const activeFiles = await FileSystem.readDirectoryAsync(paths.active);
            if (activeFiles.length === manifest.totalPages) {
                store.setStatus('INSTALLED');
                store.setDetailedStatus(null);
            } else {
                store.setError(`Eksik dosya: ${activeFiles.length}/${manifest.totalPages}`);
            }

        } catch (error: any) {
            store.incrementRetry();
            store.setError(error.message || 'Hata');
        } finally {
            await this.cleanup(currentVersion);
        }
    },

    async downloadFileWithRetry(url: string, path: string, onProgress: (percent: number) => void, retries = MAX_RETRIES) {
        for (let i = 0; i < retries; i++) {
            try {
                // Ensure directory exists
                const folder = path.substring(0, path.lastIndexOf('/'));
                await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

                // Force delete potentially corrupt/mismatched partial file from previous attempts
                await FileSystem.deleteAsync(path, { idempotent: true });

                const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress || 0);
                };

                const downloadResumable = FileSystem.createDownloadResumable(url, path, {}, callback);
                const result = await downloadResumable.downloadAsync();

                if (!result || result.status !== 200) {
                    throw new Error(`HTTP ${result?.status}`);
                }
                return;
            } catch (e: any) {
                await FileSystem.deleteAsync(path, { idempotent: true });
                if (i === retries - 1) throw e;
                await new Promise(r => setTimeout(r, Math.pow(2, i) * 2000));
            }
        }
    },

    async getFilesRecursive(dir: string): Promise<string[]> {
        const files = await FileSystem.readDirectoryAsync(dir);
        let results: string[] = [];
        for (const file of files) {
            const path = dir + file;
            const info = await FileSystem.getInfoAsync(path);
            if (info.isDirectory) {
                throw new Error(`Paket yapısı desteklenmiyor: ${file} alt klasörü bulundu.`);
            } else {
                results.push(file);
            }
        }
        return results;
    },

    async atomicSyncFromStaging(staging: string, paths: any) {
        // 1. Prepare activeNew (Full copy of current active + staging)
        await FileSystem.deleteAsync(paths.activeNew, { idempotent: true });
        await FileSystem.makeDirectoryAsync(paths.activeNew, { intermediates: true });

        // Copy existing if any
        const activeExists = await FileSystem.getInfoAsync(paths.active);
        if (activeExists.exists) {
            const oldFiles = await FileSystem.readDirectoryAsync(paths.active);
            for (const f of oldFiles) await FileSystem.copyAsync({ from: paths.active + f, to: paths.activeNew + f });
        }

        // Overlay staging
        const newFiles = await FileSystem.readDirectoryAsync(staging);
        for (const f of newFiles) await FileSystem.copyAsync({ from: staging + f, to: paths.activeNew + f });

        // 2. ATOMIC SWAP
        try {
            // Rename active -> activeSwap
            if (activeExists.exists) {
                await FileSystem.deleteAsync(paths.activeSwap, { idempotent: true });
                await FileSystem.moveAsync({ from: paths.active, to: paths.activeSwap });
            }

            // Rename activeNew -> active
            await FileSystem.moveAsync({ from: paths.activeNew, to: paths.active });

            // Success: Cleanup swap
            await FileSystem.deleteAsync(paths.activeSwap, { idempotent: true });
        } catch (e) {
            // ROLLBACK
            console.error('Swap failed, rolling back...', e);
            const swapExists = await FileSystem.getInfoAsync(paths.activeSwap);
            if (swapExists.exists) {
                await FileSystem.deleteAsync(paths.active, { idempotent: true });
                await FileSystem.moveAsync({ from: paths.activeSwap, to: paths.active });
            }
            throw e;
        }
    },

    async cleanup(version: string) {
        const paths = this.getPaths(version);
        await FileSystem.deleteAsync(paths.tmp, { idempotent: true });
        await FileSystem.deleteAsync(paths.staging, { idempotent: true });
        await FileSystem.deleteAsync(paths.activeNew, { idempotent: true });
        await FileSystem.deleteAsync(paths.activeSwap, { idempotent: true });
    },

    getPageUri(pageNumber: number): string | null {
        const store = useQuranStore.getState();
        const padNum = pageNumber.toString().padStart(3, '0');
        const fileName = `page_${padNum}.webp`;
        const version = store.installedVersion || 'v1';
        return this.getPaths(version).active + fileName;
    }
};
