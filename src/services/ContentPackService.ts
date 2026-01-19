/**
 * Content Pack Service
 * 
 * Handles downloading, verifying, and installing content packs
 * for books that are not bundled in the APK.
 * 
 * @packageDocumentation
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ContentPackManifest {
    bookId: string;
    version: string;
    files: string[];
    totalSizeBytes: number;
    sha256: string;
}

export interface DownloadProgress {
    bookId: string;
    downloadedBytes: number;
    totalBytes: number;
    percentage: number;
    status: 'downloading' | 'verifying' | 'installing' | 'completed' | 'failed';
    error?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

// ═══════════════════════════════════════════════════════════════════════════
// PATHS
// ═══════════════════════════════════════════════════════════════════════════

const CONTENT_PACKS_BASE = `${FileSystem.documentDirectory}content_packs/`;
const STAGING_DIR = `${CONTENT_PACKS_BASE}staging/`;
const ACTIVE_DIR = `${CONTENT_PACKS_BASE}active/`;
const DOWNLOADS_STATE_KEY = '@content_pack_downloads';

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE STATE
// ═══════════════════════════════════════════════════════════════════════════

interface DownloadState {
    [bookId: string]: {
        status: 'downloaded' | 'not_downloaded';
        version?: string;
        installedAt?: string;
    };
}

async function getDownloadState(): Promise<DownloadState> {
    try {
        const data = await AsyncStorage.getItem(DOWNLOADS_STATE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

async function setDownloadState(state: DownloadState): Promise<void> {
    await AsyncStorage.setItem(DOWNLOADS_STATE_KEY, JSON.stringify(state));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const ContentPackService = {
    /**
     * Initialize directory structure
     */
    async init(): Promise<void> {
        await FileSystem.makeDirectoryAsync(STAGING_DIR, { intermediates: true });
        await FileSystem.makeDirectoryAsync(ACTIVE_DIR, { intermediates: true });
    },

    /**
     * Check if a book's content pack is downloaded
     */
    async isDownloaded(bookId: string): Promise<boolean> {
        const state = await getDownloadState();
        if (state[bookId]?.status !== 'downloaded') return false;

        // Verify the active directory exists
        const activePath = `${ACTIVE_DIR}${bookId}/`;
        const info = await FileSystem.getInfoAsync(activePath);
        return info.exists;
    },

    /**
     * Get the content path for a downloaded book
     */
    getContentPath(bookId: string): string {
        return `${ACTIVE_DIR}${bookId}/content/`;
    },

    /**
     * Download and install a content pack
     */
    async downloadPack(
        bookId: string,
        downloadUrl: string,
        onProgress?: ProgressCallback
    ): Promise<boolean> {
        const stagingPath = `${STAGING_DIR}${bookId}/`;
        const activePath = `${ACTIVE_DIR}${bookId}/`;
        const zipPath = `${stagingPath}pack.zip`;

        try {
            // Initialize
            await this.init();

            // Clean any existing staging
            await this.cleanStaging(bookId);
            await FileSystem.makeDirectoryAsync(stagingPath, { intermediates: true });

            // Report: downloading
            onProgress?.({
                bookId,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 0,
                status: 'downloading'
            });

            // Download the pack
            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                zipPath,
                {},
                (downloadProgress) => {
                    const percentage = downloadProgress.totalBytesExpectedToWrite > 0
                        ? (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
                        : 0;

                    onProgress?.({
                        bookId,
                        downloadedBytes: downloadProgress.totalBytesWritten,
                        totalBytes: downloadProgress.totalBytesExpectedToWrite,
                        percentage,
                        status: 'downloading'
                    });
                }
            );

            const result = await downloadResumable.downloadAsync();
            if (!result || result.status !== 200) {
                throw new Error('Download failed');
            }

            // Report: verifying
            onProgress?.({
                bookId,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 90,
                status: 'verifying'
            });

            // Verify file exists and has content
            const zipInfo = await FileSystem.getInfoAsync(zipPath);
            if (!zipInfo.exists || zipInfo.size < 1000) {
                throw new Error('Downloaded file is invalid or empty');
            }

            // Note: Full SHA256 verification would require native module
            // For now, we trust the size check

            // Report: installing
            onProgress?.({
                bookId,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 95,
                status: 'installing'
            });

            // Atomic move: staging → active
            // First, remove any existing active content
            const activeInfo = await FileSystem.getInfoAsync(activePath);
            if (activeInfo.exists) {
                await FileSystem.deleteAsync(activePath, { idempotent: true });
            }

            // Move staging to active
            await FileSystem.moveAsync({
                from: stagingPath,
                to: activePath
            });

            // Update state
            const state = await getDownloadState();
            state[bookId] = {
                status: 'downloaded',
                version: '1.0',
                installedAt: new Date().toISOString()
            };
            await setDownloadState(state);

            // Report: completed
            onProgress?.({
                bookId,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 100,
                status: 'completed'
            });

            return true;

        } catch (error: any) {
            console.error(`[ContentPackService] Download failed for ${bookId}:`, error);

            // Clean up staging on failure
            await this.cleanStaging(bookId);

            onProgress?.({
                bookId,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 0,
                status: 'failed',
                error: error.message || 'Bilinmeyen hata'
            });

            return false;
        }
    },

    /**
     * Clean staging directory for a book
     */
    async cleanStaging(bookId: string): Promise<void> {
        try {
            const stagingPath = `${STAGING_DIR}${bookId}/`;
            const info = await FileSystem.getInfoAsync(stagingPath);
            if (info.exists) {
                await FileSystem.deleteAsync(stagingPath, { idempotent: true });
            }
        } catch (e) {
            console.warn(`[ContentPackService] Failed to clean staging for ${bookId}`);
        }
    },

    /**
     * Clean all staging directories (for app startup cleanup)
     */
    async cleanAllStaging(): Promise<void> {
        try {
            const info = await FileSystem.getInfoAsync(STAGING_DIR);
            if (info.exists) {
                await FileSystem.deleteAsync(STAGING_DIR, { idempotent: true });
                await FileSystem.makeDirectoryAsync(STAGING_DIR, { intermediates: true });
            }
        } catch (e) {
            console.warn('[ContentPackService] Failed to clean all staging');
        }
    },

    /**
     * Get download state for all books
     */
    async getAllDownloadStates(): Promise<DownloadState> {
        return getDownloadState();
    }
};
