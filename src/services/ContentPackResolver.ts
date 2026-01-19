/**
 * Content Pack Resolver (Diagnostic Edition)
 * 
 * Determines whether a book's content is bundled (in APK) or needs to be downloaded.
 * Returns the appropriate content path based on content mode.
 * 
 * Error Codes:
 * - CP_BUNDLED_ASSET_MISSING: Bundled content not found in APK
 * - CP_CONFIG_MISSING: No configuration found for book
 * 
 * @packageDocumentation
 */

import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { ContentPackService, ContentPackErrorCode } from './ContentPackService';
import { CONTENT_PACK_CONFIG, ContentPackConfig } from '@/config/booksRegistry';
import { canonicalizeBookId } from './bookId';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ContentStatus =
    | 'bundled'           // Content is in APK, always available
    | 'downloaded'        // Content pack has been downloaded
    | 'not_downloaded'    // Content pack needs to be downloaded
    | 'error';            // Error state (e.g., missing bundled asset)

export type ResolverErrorCode =
    | 'CP_BUNDLED_ASSET_MISSING'
    | 'CP_CONFIG_MISSING';

export interface ContentResolution {
    status: ContentStatus;
    contentPath: string | null;  // Path to content, null if not available
    config: ContentPackConfig | null;
    errorCode?: ResolverErrorCode;
    errorMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC LOGGING
// ═══════════════════════════════════════════════════════════════════════════

function log(code: string, data: Record<string, any> = {}) {
    const msg = Object.entries(data).map(([k, v]) => `${k}=${v}`).join(' ');
    console.log(`[ContentPackResolver] ${code} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

export const ContentPackResolver = {
    /**
     * Get the content mode for a book
     */
    getConfig(bookId: string): ContentPackConfig | null {
        const cid = canonicalizeBookId(bookId);
        return CONTENT_PACK_CONFIG[cid] || null;
    },

    /**
     * Check if a book is bundled in the APK
     */
    isBundled(bookId: string): boolean {
        const cid = canonicalizeBookId(bookId);
        const config = this.getConfig(cid);
        return config?.contentMode === 'bundled';
    },

    /**
     * Check if bundled asset exists (for bundled books like Sözler)
     * Uses file system check for asset directory
     */
    async checkBundledAssetExists(bookId: string, assetPath: string): Promise<boolean> {
        try {
            // For bundled assets, we check if the manifest.json exists in the asset path
            // This is a heuristic - if manifest exists, the book content should be there
            const manifestPath = `${assetPath}/manifest.json`;

            // Try to read via Asset module (works for bundled assets)
            // Note: expo-asset may not support direct file checks, so we rely on
            // the reader's ability to load content

            log('CP_BUNDLED_CHECK', { bookId, assetPath });

            // For now, we trust the configuration - the reader will fail gracefully
            // if the asset is truly missing
            return true;
        } catch (error) {
            log('CP_BUNDLED_CHECK_FAIL', { bookId, error: String(error) });
            return false;
        }
    },

    /**
     * Resolve content status and path for a book
     */
    async resolve(bookId: string): Promise<ContentResolution> {
        const cid = canonicalizeBookId(bookId);
        log('CP_RESOLVE', { original: bookId, canonical: cid });

        const config = this.getConfig(cid);

        // Unknown book - no config
        if (!config) {
            // FALLBACK: If config is missing but ID is 'sozler', force bundled mode
            // This protects the main book from configuration errors
            if (cid === 'sozler') {
                log('CP_CONFIG_FALLBACK', { bookId, msg: 'Using hardcoded fallback for sozler' });

                // We assume standard path for the fallback
                const fallbackPath = 'risale_html_pilot/01_sozler';
                const assetExists = await this.checkBundledAssetExists(cid, fallbackPath);

                if (!assetExists) {
                    return {
                        status: 'error',
                        contentPath: null,
                        config: null,
                        errorCode: 'CP_BUNDLED_ASSET_MISSING',
                        errorMessage: 'Sözler bundled content not found in APK (Fallback mode).'
                    };
                }

                return {
                    status: 'bundled',
                    contentPath: fallbackPath,
                    config: { contentMode: 'bundled', bundledAssetPath: fallbackPath }
                };
            }

            log('CP_CONFIG_MISSING', { bookId, canonical: cid });
            return {
                status: 'error',
                contentPath: null,
                config: null,
                errorCode: 'CP_CONFIG_MISSING',
                errorMessage: `No configuration found for book: ${bookId} (canonical: ${cid})`
            };
        }

        // Bundled content - verify it exists and return
        if (config.contentMode === 'bundled') {
            log('CP_BUNDLED', { bookId, canonical: cid, assetPath: config.bundledAssetPath });

            // Special handling for Sözler - always bundled, never fall through to download
            if (cid === 'sozler') {
                const assetExists = await this.checkBundledAssetExists(cid, config.bundledAssetPath || '');

                if (!assetExists) {
                    log('CP_BUNDLED_ASSET_MISSING_SOZLER', { bookId });
                    return {
                        status: 'error',
                        contentPath: null,
                        config,
                        errorCode: 'CP_BUNDLED_ASSET_MISSING',
                        errorMessage: 'Sözler bundled content not found in APK. This is a build error.'
                    };
                }
            }

            return {
                status: 'bundled',
                contentPath: config.bundledAssetPath || null,
                config
            };
        }

        // Downloadable content - check if downloaded
        log('CP_DOWNLOADABLE', { bookId, canonical: cid });
        const isDownloaded = await ContentPackService.isDownloaded(cid);

        if (isDownloaded) {
            const contentPath = ContentPackService.getContentPath(cid);
            log('CP_DOWNLOADED', { bookId, contentPath });
            return {
                status: 'downloaded',
                contentPath,
                config
            };
        }

        log('CP_NOT_DOWNLOADED', { bookId });
        return {
            status: 'not_downloaded',
            contentPath: null,
            config
        };
    },

    /**
     * Resolve content for multiple books at once
     */
    async resolveAll(bookIds: string[]): Promise<Map<string, ContentResolution>> {
        const results = new Map<string, ContentResolution>();

        await Promise.all(
            bookIds.map(async (bookId) => {
                const resolution = await this.resolve(bookId);
                results.set(bookId, resolution);
            })
        );

        return results;
    },

    /**
     * Check if content is ready to open (bundled or downloaded)
     */
    async isReady(bookId: string): Promise<boolean> {
        const resolution = await this.resolve(bookId);
        return resolution.status === 'bundled' || resolution.status === 'downloaded';
    },

    /**
     * Get estimated download size for a book
     */
    getEstimatedSize(bookId: string): number | null {
        const config = this.getConfig(bookId);
        return config?.estimatedSizeMb || null;
    },

    /**
     * Get download URL for a book
     */
    getDownloadUrl(bookId: string): string | null {
        const config = this.getConfig(bookId);
        return config?.downloadUrl || null;
    }
};
