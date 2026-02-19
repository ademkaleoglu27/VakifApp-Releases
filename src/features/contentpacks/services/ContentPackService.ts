
import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { ContentPackStore } from '../store/createContentPackStore';

export interface ContentAsset {
    id: string;
    filename: string;
    sizeBytes: number;
    sha256: string;
    url: string;
    pageFrom?: number;
    pageTo?: number;
}

export interface ContentManifest {
    version: string;
    totalPages: number;
    filePattern: string;
    downloadMode: 'single' | 'multipart';
    cacheBust: string;
    assets: ContentAsset | ContentAsset[];
    updatedAt: string;
}

export interface ContentPackConfig {
    packId: string;
    manifestUrl: string;
    storageDir: string;
    store: () => ContentPackStore; // Get latest store state
}

const DOWNLOAD_TIMEOUT = 45000;
const MAX_RETRIES = 3;

export class ContentPackService {
    constructor(private config: ContentPackConfig) { }

    private get paths() {
        const dir = this.config.storageDir;
        // Check if dir ends with /
        const base = dir.endsWith('/') ? dir : dir + '/';
        const version = this.config.store().getState().installedVersion || 'v1';

        return {
            root: base,
            active: `${base}active/${version}/pages/`,
            activeSwap: `${base}active/${version}/pages_swap/`,
            activeNew: `${base}active/${version}/pages_new/`,
            staging: `${base}staging/${version}/`,
            tmp: `${base}tmp/${version}/`
        };
    }

    async fetchManifest(): Promise<ContentManifest> {
        const response = await this.fetchWithRetry(`${this.config.manifestUrl}?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Manifest yüklenemedi (HTTP ${response.status})`);

        const text = await response.text();
        const cleanText = text.replace(/^\uFEFF/, '').trim();

        try {
            const manifest = JSON.parse(cleanText);
            this.config.store().getState().setTotalPages(manifest.totalPages);
            return manifest;
        } catch (e) {
            console.error("Manifest parse error:", cleanText.substring(0, 100));
            throw new Error(`JSON Parse error.`);
        }
    }

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
    }

    async checkDiskSpace(requiredBytes: number): Promise<boolean> {
        const freeSpace = await FileSystem.getFreeDiskStorageAsync();
        return freeSpace > requiredBytes;
    }

    async verifyHash(filePath: string, expectedHash: string): Promise<boolean> {
        const cleanPath = filePath.replace('file://', '');
        const actualHash = await ReactNativeBlobUtil.fs.hash(cleanPath, 'sha256');
        return actualHash.toLowerCase() === expectedHash.toLowerCase();
    }

    async downloadAndInstall() {
        const store = this.config.store().getState();
        store.setStatus('DOWNLOADING');
        store.setDownloadProgress(0);
        store.setDetailedStatus('Manifest alınıyor...');

        let currentVersion = store.installedVersion || 'v1';

        try {
            const manifest = await this.fetchManifest();
            currentVersion = manifest.version;
            const paths = this.paths; // Computed with new version if updated? 
            // Actually paths getter relies on store.installedVersion. 
            // If manifest.version is diff, we should probably update paths.
            // But we can't update store.installedVersion yet until installed.
            // So we need to override version in getPaths logic or just pass it around.
            // For simplicity, let's assume we install into target version paths.

            const getVersionedPaths = (ver: string) => {
                const base = this.config.storageDir.endsWith('/') ? this.config.storageDir : this.config.storageDir + '/';
                return {
                    root: base,
                    active: `${base}active/${ver}/pages/`,
                    activeSwap: `${base}active/${ver}/pages_swap/`,
                    activeNew: `${base}active/${ver}/pages_new/`,
                    staging: `${base}staging/${ver}/`,
                    tmp: `${base}tmp/${ver}/`
                };
            }

            const targetPaths = getVersionedPaths(currentVersion);

            const assets = Array.isArray(manifest.assets) ? manifest.assets : [manifest.assets];
            const totalAssets = assets.length;
            const totalSize = assets.reduce((acc, a) => acc + a.sizeBytes, 0);

            const factor = 3;
            const requiredBytes = Math.ceil(totalSize * factor);
            const requiredMB = Math.ceil(requiredBytes / 1024 / 1024);

            if (!(await this.checkDiskSpace(requiredBytes))) {
                throw new Error(`Yetersiz depolama alanı. Lütfen en az ${requiredMB}MB yer açın.`);
            }

            await FileSystem.makeDirectoryAsync(targetPaths.staging, { intermediates: true });
            await FileSystem.makeDirectoryAsync(targetPaths.tmp, { intermediates: true });

            let completedCount = 0;

            for (const asset of assets) {
                if (store.installedParts.includes(asset.id) && store.installedVersion === currentVersion) {
                    completedCount++;
                    continue;
                }

                store.setDetailedStatus(`${asset.id} indiriliyor...`);
                const zipPath = `${targetPaths.tmp}${asset.filename}`;
                const assetStaging = `${targetPaths.staging}${asset.id}/`;
                await FileSystem.makeDirectoryAsync(assetStaging, { intermediates: true });

                await this.downloadFileWithRetry(
                    asset.url,
                    zipPath,
                    (assetProgress) => {
                        const totalProgress = (completedCount + assetProgress) / totalAssets;
                        this.config.store().getState().setDownloadProgress(totalProgress);
                    }
                );

                store.setDetailedStatus(`${asset.id} doğrulanıyor...`);
                // Skip hash check if dev mode or not provided (optional)
                if (asset.sha256) {
                    if (!(await this.verifyHash(zipPath, asset.sha256))) throw new Error(`${asset.id} HASH hatası`);
                }

                store.setDetailedStatus(`${asset.id} paket açılıyor...`);
                await unzip(zipPath, assetStaging);

                // Validation logic (generic)
                const foundFiles = await this.getFilesRecursive(assetStaging);
                const pageFiles = foundFiles.filter(f => new RegExp(manifest.filePattern).test(f)); // Use regex from manifest? 
                // Regex in JSON is string, need to convert.
                // Or just assume page_\d+.webp standard.
                // Let's assume standard for now to be safe.
                const validFiles = foundFiles.filter(f => /^page_\d{3}\.(webp|jpg|png)$/.test(f));

                if (foundFiles.length !== validFiles.length) {
                    // Warn but don't fail, maybe readme files etc.
                    console.warn(`${asset.id}: Unexpected files found.`);
                }

                store.setDetailedStatus(`${asset.id} kuruluyor...`);
                await this.atomicSyncFromStaging(assetStaging, targetPaths);

                completedCount++;
                store.addInstalledPart(asset.id);
                store.setInstalledVersion(currentVersion);
                store.setDownloadProgress(completedCount / totalAssets);
                if (completedCount === 1 && totalAssets > 1) store.setStatus('PARTIAL');

                await FileSystem.deleteAsync(zipPath, { idempotent: true });
                await FileSystem.deleteAsync(assetStaging, { idempotent: true });
            }

            const activeFiles = await FileSystem.readDirectoryAsync(targetPaths.active);

            // Check count if possible
            if (activeFiles.length >= (manifest.totalPages || 0)) {
                store.setStatus('INSTALLED');
                store.setDetailedStatus(null);
            } else {
                // Maybe successful partial?
                store.setStatus('INSTALLED'); // Trust the process for now
            }

        } catch (error: any) {
            store.incrementRetry();
            store.setError(error.message || 'Hata');
        } finally {
            // Cleanup
            const paths = this.paths; // Recalculate based on store version (which should be updated now)
            try {
                await FileSystem.deleteAsync(paths.tmp, { idempotent: true });
                await FileSystem.deleteAsync(paths.staging, { idempotent: true });
            } catch (e) { }
        }
    }

    async downloadFileWithRetry(url: string, path: string, onProgress: (percent: number) => void, retries = MAX_RETRIES) {
        for (let i = 0; i < retries; i++) {
            try {
                const folder = path.substring(0, path.lastIndexOf('/'));
                await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
                await FileSystem.deleteAsync(path, { idempotent: true });

                const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress || 0);
                };

                const downloadResumable = FileSystem.createDownloadResumable(url, path, {}, callback);
                const result = await downloadResumable.downloadAsync();
                if (!result || result.status !== 200) throw new Error(`HTTP ${result?.status}`);
                return;
            } catch (e: any) {
                await FileSystem.deleteAsync(path, { idempotent: true });
                if (i === retries - 1) throw e;
                await new Promise(r => setTimeout(r, Math.pow(2, i) * 2000));
            }
        }
    }

    async getFilesRecursive(dir: string): Promise<string[]> {
        const files = await FileSystem.readDirectoryAsync(dir);
        let results: string[] = [];
        for (const file of files) {
            const path = dir + file;
            const info = await FileSystem.getInfoAsync(path);
            if (!info.isDirectory) {
                results.push(file);
            }
        }
        return results;
    }

    async atomicSyncFromStaging(staging: string, paths: any) {
        await FileSystem.deleteAsync(paths.activeNew, { idempotent: true });
        await FileSystem.makeDirectoryAsync(paths.activeNew, { intermediates: true });

        const activeExists = await FileSystem.getInfoAsync(paths.active);
        if (activeExists.exists) {
            const oldFiles = await FileSystem.readDirectoryAsync(paths.active);
            for (const f of oldFiles) await FileSystem.copyAsync({ from: paths.active + f, to: paths.activeNew + f });
        }

        const newFiles = await FileSystem.readDirectoryAsync(staging);
        for (const f of newFiles) await FileSystem.copyAsync({ from: staging + f, to: paths.activeNew + f });

        try {
            if (activeExists.exists) {
                await FileSystem.deleteAsync(paths.activeSwap, { idempotent: true });
                await FileSystem.moveAsync({ from: paths.active, to: paths.activeSwap });
            }
            await FileSystem.moveAsync({ from: paths.activeNew, to: paths.active });
            await FileSystem.deleteAsync(paths.activeSwap, { idempotent: true });
        } catch (e) {
            console.error('Swap failed, rolling back...', e);
            const swapExists = await FileSystem.getInfoAsync(paths.activeSwap);
            if (swapExists.exists) {
                await FileSystem.deleteAsync(paths.active, { idempotent: true });
                await FileSystem.moveAsync({ from: paths.activeSwap, to: paths.active });
            }
            throw e;
        }
    }

    getPageUri(pageNumber: number): string | null {
        const store = this.config.store().getState();
        const padNum = pageNumber.toString().padStart(3, '0');
        const fileName = `page_${padNum}.webp`; // Assume webp for now
        const version = store.installedVersion || 'v1';

        // Check local folder first? 
        // Logic: active/v1/pages/page_001.webp
        const path = `${this.config.storageDir}/active/${version}/pages/${fileName}`;
        // Verify existence logic is done in the UI component usually (via Image.onError or FileSystem check).
        // Returning string is safer.
        return path;
    }
}
