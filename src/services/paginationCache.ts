/**
 * paginationCache.ts (V25.1 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * Pagination cache helper with contentHash for cache safety.
 * 
 * Cache Key Format:
 * ${bookId}:${contentHash}:${fontScale}:${w}:${h}:${themeId}:${BUILD_VERSION}
 * 
 * One-time migration:
 * On app start, if storedVersion != BUILD_VERSION OR storedHash != contentHash:
 *   - Clear pagination cache
 *   - Persist new version/hash
 * ─────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Build version - bump this to invalidate all caches
export const BUILD_VERSION = '25.1.0';

// Storage keys
const CACHE_VERSION_KEY = '@pagination_cache_version';
const CACHE_HASH_KEY = '@pagination_cache_hash';
const CACHE_PREFIX = '@pagination_cache:';

/**
 * Generate content hash from stream/blocks
 * Uses djb2 algorithm for fast hashing
 */
export function generateContentHash(content: string): string {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) + hash) + content.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

/**
 * Generate cache key for pagination
 */
export function getCacheKey(opts: {
    bookId: string;
    contentHash: string;
    fontScale: number;
    viewportWidth: number;
    viewportHeight: number;
    themeId: string;
}): string {
    return `${opts.bookId}:${opts.contentHash}:${opts.fontScale}:${opts.viewportWidth}:${opts.viewportHeight}:${opts.themeId}:${BUILD_VERSION}`;
}

/**
 * Check if cache migration is needed and perform it
 * Returns true if migration was performed
 */
export async function checkAndMigrateCache(currentContentHash: string): Promise<boolean> {
    try {
        const [storedVersion, storedHash] = await Promise.all([
            AsyncStorage.getItem(CACHE_VERSION_KEY),
            AsyncStorage.getItem(CACHE_HASH_KEY),
        ]);

        const needsMigration = storedVersion !== BUILD_VERSION || storedHash !== currentContentHash;

        if (needsMigration) {
            console.log('[PaginationCache] Migration triggered', {
                oldVersion: storedVersion,
                newVersion: BUILD_VERSION,
                oldHash: storedHash,
                newHash: currentContentHash,
            });

            // Clear all pagination cache entries
            const allKeys = await AsyncStorage.getAllKeys();
            const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
            if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
                console.log(`[PaginationCache] Cleared ${cacheKeys.length} cache entries`);
            }

            // Store new version and hash
            await Promise.all([
                AsyncStorage.setItem(CACHE_VERSION_KEY, BUILD_VERSION),
                AsyncStorage.setItem(CACHE_HASH_KEY, currentContentHash),
            ]);

            return true;
        }

        return false;
    } catch (e) {
        console.warn('[PaginationCache] Migration error', e);
        return false;
    }
}

/**
 * Get cached pagination data
 */
export async function getCachedPagination<T>(key: string): Promise<T | null> {
    try {
        const data = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Set cached pagination data
 */
export async function setCachedPagination<T>(key: string, data: T): Promise<void> {
    try {
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
        console.warn('[PaginationCache] Failed to set cache', e);
    }
}

/**
 * Clear all pagination cache
 */
export async function clearPaginationCache(): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
        // Also clear version/hash to force re-migration
        await AsyncStorage.multiRemove([CACHE_VERSION_KEY, CACHE_HASH_KEY]);
        console.log('[PaginationCache] Cache cleared');
    } catch (e) {
        console.warn('[PaginationCache] Failed to clear cache', e);
    }
}

export const paginationCache = {
    BUILD_VERSION,
    generateContentHash,
    getCacheKey,
    checkAndMigrateCache,
    getCachedPagination,
    setCachedPagination,
    clearPaginationCache,
};

export default paginationCache;
