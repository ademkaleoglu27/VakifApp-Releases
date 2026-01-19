/**
 * Content Pack Resolver
 * 
 * Determines whether a book's content is bundled (in APK) or needs to be downloaded.
 * Returns the appropriate content path based on content mode.
 * 
 * @packageDocumentation
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { ContentPackService } from './ContentPackService';
import { CONTENT_PACK_CONFIG, ContentPackConfig } from '@/config/booksRegistry';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ContentStatus =
    | 'bundled'           // Content is in APK, always available
    | 'downloaded'        // Content pack has been downloaded
    | 'not_downloaded';   // Content pack needs to be downloaded

export interface ContentResolution {
    status: ContentStatus;
    contentPath: string | null;  // Path to content, null if not available
    config: ContentPackConfig | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

export const ContentPackResolver = {
    /**
     * Get the content mode for a book
     */
    getConfig(bookId: string): ContentPackConfig | null {
        return CONTENT_PACK_CONFIG[bookId] || null;
    },

    /**
     * Check if a book is bundled in the APK
     */
    isBundled(bookId: string): boolean {
        const config = this.getConfig(bookId);
        return config?.contentMode === 'bundled';
    },

    /**
     * Resolve content status and path for a book
     */
    async resolve(bookId: string): Promise<ContentResolution> {
        const config = this.getConfig(bookId);

        // Unknown book
        if (!config) {
            return {
                status: 'not_downloaded',
                contentPath: null,
                config: null
            };
        }

        // Bundled content - always available
        if (config.contentMode === 'bundled') {
            return {
                status: 'bundled',
                contentPath: config.bundledAssetPath || null,
                config
            };
        }

        // Downloadable content - check if downloaded
        const isDownloaded = await ContentPackService.isDownloaded(bookId);

        if (isDownloaded) {
            return {
                status: 'downloaded',
                contentPath: ContentPackService.getContentPath(bookId),
                config
            };
        }

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
