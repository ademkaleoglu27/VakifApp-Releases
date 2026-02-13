/**
 * Content Pack Service (Diagnostic Edition)
 * 
 * Handles downloading, verifying, extracting, and installing content packs
 * for books that are not bundled in the APK.
 * 
 * Error Codes (CP_*):
 * - CP_URL_INVALID_TAG_PAGE: URL contains /releases/tag/ instead of /releases/download/
 * - CP_HTTP_FAILED: HTTP request failed (status != 200)
 * - CP_NOT_A_ZIP_GOT_HTML: Downloaded content is HTML, not ZIP
 * - CP_DOWNLOAD_EMPTY: Downloaded file is empty or too small
 * - CP_UNZIP_FAIL: ZIP extraction failed
 * - CP_MANIFEST_MISSING: No manifest.json found in pack
 * - CP_MANIFEST_AMBIGUOUS: Multiple manifest.json candidates found
 * - CP_INSTALL_FAIL: Failed to install pack to active directory
 * 
 * @packageDocumentation
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unzip } from 'react-native-zip-archive';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════

export type ContentPackErrorCode =
    | 'CP_URL_INVALID_TAG_PAGE'
    | 'CP_HTTP_FAILED'
    | 'CP_NOT_A_ZIP_GOT_HTML'
    | 'CP_DOWNLOAD_EMPTY'
    | 'CP_UNZIP_FAIL'
    | 'CP_MANIFEST_MISSING'
    | 'CP_MANIFEST_AMBIGUOUS'
    | 'CP_INSTALL_FAIL';

export class ContentPackError extends Error {
    code: ContentPackErrorCode;
    details?: string;

    constructor(code: ContentPackErrorCode, details?: string) {
        super(`${code}${details ? `: ${details}` : ''}`);
        this.code = code;
        this.details = details;
        this.name = 'ContentPackError';
    }
}

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
    status: 'downloading' | 'verifying' | 'extracting' | 'installing' | 'completed' | 'failed';
    error?: string;
    errorCode?: ContentPackErrorCode;
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
// DIAGNOSTIC LOGGING
// ═══════════════════════════════════════════════════════════════════════════

function log(code: string, data: Record<string, any> = {}) {
    const msg = Object.entries(data).map(([k, v]) => `${k}=${v}`).join(' ');
    console.log(`[ContentPack] ${code} ${msg}`);
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

        // Check 1: Record in AsyncStorage
        if (state[bookId]?.status !== 'downloaded') {
            log('IS_DOWNLOADED_FAIL_STATE', {
                bookId,
                recordExists: !!state[bookId],
                status: state[bookId]?.status
            });
            return false;
        }

        // Check 2: Active Directory Exists
        const activePath = `${ACTIVE_DIR}${bookId}/`;
        const dirInfo = await FileSystem.getInfoAsync(activePath);

        if (!dirInfo.exists) {
            log('IS_DOWNLOADED_FAIL_DIR', { bookId, path: activePath });
            return false;
        }

        // Check 3: Manifest Exists (Integrity)
        const manifestPath = `${activePath}manifest.json`;
        const manifestInfo = await FileSystem.getInfoAsync(manifestPath);

        if (!manifestInfo.exists) {
            log('IS_DOWNLOADED_FAIL_MANIFEST', { bookId, path: manifestPath });
            return false;
        }

        return true;
    },

    /**
     * Get the content path for a downloaded book
     */
    getContentPath(bookId: string): string {
        return `${ACTIVE_DIR}${bookId}/`;
    },

    /**
     * Validate download URL before starting
     */
    validateUrl(downloadUrl: string): void {
        log('CP_URL', { url: downloadUrl });

        // Check for tag page URL (invalid)
        if (downloadUrl.includes('/releases/tag/')) {
            throw new ContentPackError(
                'CP_URL_INVALID_TAG_PAGE',
                "URL contains '/releases/tag/'. Must use '/releases/download/' for direct asset download."
            );
        }

        // Validate it's a proper download URL
        if (!downloadUrl.includes('/releases/download/')) {
            log('CP_URL_WARNING', { msg: 'URL may not be a GitHub Releases direct download link' });
        }
    },

    /**
     * Verify downloaded content is a valid ZIP file
     */
    async verifyZipContent(zipPath: string): Promise<void> {
        // Read first 100 bytes to check content
        const content = await FileSystem.readAsStringAsync(zipPath, {
            encoding: FileSystem.EncodingType.UTF8,
            length: 100
        });

        // Check for HTML content (wrong URL redirect to web page)
        if (content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('<HTML')) {
            log('CP_SIGNATURE', { firstBytes: content.substring(0, 50), type: 'HTML' });
            throw new ContentPackError(
                'CP_NOT_A_ZIP_GOT_HTML',
                'Downloaded content is HTML, not ZIP. Check download URL.'
            );
        }

        // ZIP files start with "PK" (0x50 0x4B)
        if (!content.startsWith('PK')) {
            log('CP_SIGNATURE', { firstBytes: content.substring(0, 10), type: 'UNKNOWN' });
            // Not throwing here - might still be valid binary that reads weird as UTF8
            log('CP_SIGNATURE_WARNING', { msg: 'File does not start with PK signature, may not be valid ZIP' });
        } else {
            log('CP_SIGNATURE', { firstBytes: 'PK...', type: 'ZIP' });
        }
    },

    /**
     * Find manifest.json in extracted content (with tolerance for nested structure)
     */
    async findManifest(extractPath: string): Promise<{ manifestPath: string; contentRoot: string }> {
        // First, check root level
        const rootManifest = `${extractPath}manifest.json`;
        const rootInfo = await FileSystem.getInfoAsync(rootManifest);

        if (rootInfo.exists) {
            log('CP_MANIFEST_FOUND', { path: rootManifest, level: 'root' });
            return { manifestPath: rootManifest, contentRoot: extractPath };
        }

        // Check one level deep
        const items = await FileSystem.readDirectoryAsync(extractPath);
        const candidates: string[] = [];

        for (const item of items) {
            const itemPath = `${extractPath}${item}/`;
            const itemInfo = await FileSystem.getInfoAsync(itemPath);

            if (itemInfo.isDirectory) {
                const nestedManifest = `${itemPath}manifest.json`;
                const nestedInfo = await FileSystem.getInfoAsync(nestedManifest);

                if (nestedInfo.exists) {
                    candidates.push(item);
                }
            }
        }

        if (candidates.length === 0) {
            log('CP_MANIFEST_MISSING', { searchPath: extractPath });
            throw new ContentPackError('CP_MANIFEST_MISSING', `No manifest.json found in ${extractPath}`);
        }

        if (candidates.length > 1) {
            log('CP_MANIFEST_AMBIGUOUS', { candidates: candidates.join(', ') });
            throw new ContentPackError('CP_MANIFEST_AMBIGUOUS', `Multiple manifest candidates: ${candidates.join(', ')}`);
        }

        const foundDir = candidates[0];
        const manifestPath = `${extractPath}${foundDir}/manifest.json`;
        log('CP_MANIFEST_FOUND', { path: manifestPath, level: 'nested', dir: foundDir });

        return { manifestPath, contentRoot: `${extractPath}${foundDir}/` };
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
        const extractPath = `${stagingPath}extracted/`;

        log('CP_RESOLVE_START', { bookId });

        try {
            // Initialize
            await this.init();

            // Validate URL before starting
            this.validateUrl(downloadUrl);

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
            log('CP_DOWNLOAD_START', { bookId, url: downloadUrl });

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
                        percentage: Math.min(percentage, 70), // Reserve 30% for extract/install
                        status: 'downloading'
                    });
                }
            );

            const result = await downloadResumable.downloadAsync();

            if (!result) {
                log('CP_HTTP', { status: 'null', msg: 'Download returned null' });
                throw new ContentPackError('CP_HTTP_FAILED', 'Download returned null result');
            }

            log('CP_HTTP', {
                status: result.status,
                uri: result.uri,
                headers: JSON.stringify(result.headers || {}).substring(0, 100)
            });

            if (result.status !== 200) {
                throw new ContentPackError('CP_HTTP_FAILED', `HTTP status ${result.status}`);
            }

            // Verify file exists and has content
            const zipInfo = await FileSystem.getInfoAsync(zipPath);
            log('CP_DOWNLOAD_COMPLETE', {
                exists: zipInfo.exists,
                size: (zipInfo as any).size || 0
            });

            if (!zipInfo.exists) {
                throw new ContentPackError('CP_DOWNLOAD_EMPTY', 'Downloaded file does not exist');
            }

            const zipSize = (zipInfo as any).size || 0;
            if (zipSize < 1000) {
                throw new ContentPackError('CP_DOWNLOAD_EMPTY', `File too small: ${zipSize} bytes`);
            }

            // Report: verifying
            onProgress?.({
                bookId,
                downloadedBytes: zipSize,
                totalBytes: zipSize,
                percentage: 75,
                status: 'verifying'
            });

            // Verify it's actually a ZIP file
            await this.verifyZipContent(zipPath);

            // Report: extracting
            onProgress?.({
                bookId,
                downloadedBytes: zipSize,
                totalBytes: zipSize,
                percentage: 80,
                status: 'extracting'
            });

            // Extract ZIP
            log('CP_UNZIP_START', { zipPath, extractPath });
            try {
                await FileSystem.makeDirectoryAsync(extractPath, { intermediates: true });
                await unzip(zipPath, extractPath);
                log('CP_UNZIP_OK', { extractPath });
            } catch (unzipError: any) {
                log('CP_UNZIP_FAIL', { error: unzipError.message });
                throw new ContentPackError('CP_UNZIP_FAIL', unzipError.message);
            }

            // Find manifest (with tolerance for nested structure)
            const { contentRoot } = await this.findManifest(extractPath);

            // Report: installing
            onProgress?.({
                bookId,
                downloadedBytes: zipSize,
                totalBytes: zipSize,
                percentage: 90,
                status: 'installing'
            });

            // Atomic move: content root → active
            log('CP_INSTALL_START', { from: contentRoot, to: activePath });

            try {
                // Remove any existing active content
                const activeInfo = await FileSystem.getInfoAsync(activePath);
                if (activeInfo.exists) {
                    await FileSystem.deleteAsync(activePath, { idempotent: true });
                }

                // Move extracted content to active
                await FileSystem.moveAsync({
                    from: contentRoot,
                    to: activePath
                });

                log('CP_INSTALL_OK', { activePath });
            } catch (installError: any) {
                log('CP_INSTALL_FAIL', { error: installError.message });
                throw new ContentPackError('CP_INSTALL_FAIL', installError.message);
            }

            // Clean up staging (remove zip and any leftover extracted files)
            await this.cleanStaging(bookId);

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
                downloadedBytes: zipSize,
                totalBytes: zipSize,
                percentage: 100,
                status: 'completed'
            });

            log('CP_RESOLVE_DONE', { bookId, status: 'downloaded' });
            return true;

        } catch (error: any) {
            const errorCode = error instanceof ContentPackError ? error.code : undefined;
            const errorMsg = error.message || 'Bilinmeyen hata';

            log('CP_RESOLVE_DONE', {
                bookId,
                status: 'error',
                code: errorCode || 'UNKNOWN',
                error: errorMsg
            });

            // Clean up staging on failure
            await this.cleanStaging(bookId);

            onProgress?.({
                bookId,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 0,
                status: 'failed',
                error: errorMsg,
                errorCode
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
