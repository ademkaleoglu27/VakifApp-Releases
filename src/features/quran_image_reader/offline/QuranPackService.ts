import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unzip } from 'react-native-zip-archive';
import { QURAN_IMAGE_CONFIG } from '../quranImageConfig';

const QURAN_PACK_STATE_KEY = '@quran_pack_v1_download_state';

export interface QuranPackStatus {
    installed: boolean;
    version: string;
    pagesPresent: number;
    lastChecked?: string;
}

export interface DownloadProgress {
    percentage: number; // 0 to 1
    downloadedCount: number;
    totalCount: number;
    status: 'starting' | 'downloading' | 'verifying' | 'extracting' | 'installing' | 'completed' | 'failed';
    error?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export const QuranPackService = {
    async getPackStatus(): Promise<QuranPackStatus> {
        try {
            const data = await AsyncStorage.getItem(QURAN_PACK_STATE_KEY);
            const state = data ? JSON.parse(data) : { installed: false, version: 'v1', pagesPresent: 0 };

            if (state.installed) {
                const activeDir = QURAN_IMAGE_CONFIG.OFFLINE.ACTIVE_DIR;
                const info = await FileSystem.getInfoAsync(activeDir);
                if (!info.exists) {
                    return { ...state, installed: false, pagesPresent: 0 };
                }

                const pagesDir = `${activeDir}pages/`;
                const pagesInfo = await FileSystem.getInfoAsync(pagesDir);
                if (pagesInfo.exists) {
                    const files = await FileSystem.readDirectoryAsync(pagesDir);
                    state.pagesPresent = files.filter(f => f.endsWith('.webp')).length;
                }
            }

            return state;
        } catch (e) {
            return { installed: false, version: 'v1', pagesPresent: 0 };
        }
    },

    async downloadPackV1(onProgress?: ProgressCallback): Promise<boolean> {
        const { STAGING_DIR, ACTIVE_DIR, ZIP_URL, PAGE_COUNT } = QURAN_IMAGE_CONFIG.OFFLINE ? {
            ...QURAN_IMAGE_CONFIG.OFFLINE,
            ZIP_URL: QURAN_IMAGE_CONFIG.ZIP_URL,
            PAGE_COUNT: QURAN_IMAGE_CONFIG.PAGE_COUNT
        } : {} as any;

        if (!STAGING_DIR) return false;

        const zipPath = `${STAGING_DIR}pack.zip`;
        const extractPath = `${STAGING_DIR}temp_extracted/`;

        try {
            onProgress?.({ percentage: 0, downloadedCount: 0, totalCount: PAGE_COUNT, status: 'starting' });

            // 1. Ensure staging directory exists
            await FileSystem.makeDirectoryAsync(STAGING_DIR, { intermediates: true });

            onProgress?.({ percentage: 0.1, downloadedCount: 0, totalCount: PAGE_COUNT, status: 'downloading' });

            // 2. Download ZIP
            const downloadResumable = FileSystem.createDownloadResumable(
                ZIP_URL,
                zipPath,
                {},
                (dp) => {
                    const progress = dp.totalBytesExpectedToWrite > 0
                        ? (dp.totalBytesWritten / dp.totalBytesExpectedToWrite)
                        : 0;
                    onProgress?.({
                        percentage: progress * 0.8, // Reserve 20% for unzip
                        downloadedCount: 0,
                        totalCount: PAGE_COUNT,
                        status: 'downloading'
                    });
                }
            );

            const result = await downloadResumable.downloadAsync();
            if (!result || result.status !== 200) {
                throw new Error(`Download failed with status ${result?.status || 'unknown'}`);
            }

            // 3. Extract ZIP
            onProgress?.({ percentage: 0.85, downloadedCount: 0, totalCount: PAGE_COUNT, status: 'extracting' });

            await FileSystem.makeDirectoryAsync(extractPath, { intermediates: true });
            await unzip(zipPath, extractPath);

            // 4. Verify extracted content
            onProgress?.({ percentage: 0.95, downloadedCount: 0, totalCount: PAGE_COUNT, status: 'verifying' });

            // Check if extracted folder has 'pages' and 'manifest.json'
            // Support both direct extraction and nested folder if any
            let contentSource = extractPath;
            const items = await FileSystem.readDirectoryAsync(extractPath);
            if (items.length === 1 && (await FileSystem.getInfoAsync(extractPath + items[0])).isDirectory) {
                contentSource = extractPath + items[0] + '/';
            }

            const verification = await this.verifyPackV1(contentSource);
            if (!verification.ok) {
                throw new Error(`Verification failed: ${verification.error}`);
            }

            // 5. Atomic installation
            onProgress?.({ percentage: 0.98, downloadedCount: PAGE_COUNT, totalCount: PAGE_COUNT, status: 'installing' });

            const activeInfo = await FileSystem.getInfoAsync(ACTIVE_DIR);
            if (activeInfo.exists) {
                await FileSystem.deleteAsync(ACTIVE_DIR, { idempotent: true });
            }

            await FileSystem.makeDirectoryAsync(QURAN_IMAGE_CONFIG.OFFLINE.BASE_DIR + 'active/', { intermediates: true });
            await FileSystem.moveAsync({
                from: contentSource,
                to: ACTIVE_DIR
            });

            // Clean up staging
            await FileSystem.deleteAsync(STAGING_DIR, { idempotent: true });

            // 6. Update state
            const newState: QuranPackStatus = {
                installed: true,
                version: 'v1',
                pagesPresent: PAGE_COUNT,
                lastChecked: new Date().toISOString()
            };
            await AsyncStorage.setItem(QURAN_PACK_STATE_KEY, JSON.stringify(newState));

            onProgress?.({ percentage: 1, downloadedCount: PAGE_COUNT, totalCount: PAGE_COUNT, status: 'completed' });
            return true;
        } catch (e: any) {
            console.error('[QuranPackService] Download/Install failed:', e);
            onProgress?.({
                percentage: 0,
                downloadedCount: 0,
                totalCount: PAGE_COUNT,
                status: 'failed',
                error: e.message
            });
            // Cleanup on failure
            try { await FileSystem.deleteAsync(STAGING_DIR, { idempotent: true }); } catch { }
            return false;
        }
    },

    async verifyPackV1(dirPath?: string): Promise<{ ok: boolean; error?: string; details?: any }> {
        const targetDir = dirPath || QURAN_IMAGE_CONFIG.OFFLINE.ACTIVE_DIR;
        const pageCount = QURAN_IMAGE_CONFIG.PAGE_COUNT;

        try {
            const dirInfo = await FileSystem.getInfoAsync(targetDir);
            if (!dirInfo.exists) return { ok: false, error: 'Directory does not exist' };

            const pagesDir = `${targetDir}pages/`;
            const pagesInfo = await FileSystem.getInfoAsync(pagesDir);
            if (!pagesInfo.exists) return { ok: false, error: 'pages directory missing' };

            const files = await FileSystem.readDirectoryAsync(pagesDir);
            const webpFiles = files.filter(f => f.endsWith('.webp'));

            if (webpFiles.length < pageCount) {
                return { ok: false, error: `Missing pages: found ${webpFiles.length}/${pageCount}` };
            }

            // Spot check
            const checks = ['0001.webp', '0002.webp', '0300.webp', '0616.webp'];
            for (const check of checks) {
                const fileInfo = await FileSystem.getInfoAsync(`${pagesDir}${check}`);
                if (!fileInfo.exists || (fileInfo as any).size === 0) {
                    return { ok: false, error: `Incomplete file: ${check}` };
                }
            }

            return {
                ok: true,
                details: {
                    pagesFound: webpFiles.length,
                    dir: targetDir
                }
            };
        } catch (e: any) {
            return { ok: false, error: e.message };
        }
    },

    async clearPackV1(): Promise<void> {
        try {
            const baseDir = QURAN_IMAGE_CONFIG.OFFLINE.BASE_DIR;
            const info = await FileSystem.getInfoAsync(baseDir);
            if (info.exists) {
                await FileSystem.deleteAsync(baseDir, { idempotent: true });
            }
            await AsyncStorage.removeItem(QURAN_PACK_STATE_KEY);
        } catch (e) {
            console.error('[QuranPackService] Clear failed:', e);
        }
    }
};
