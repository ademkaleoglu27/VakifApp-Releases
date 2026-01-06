import AsyncStorage from '@react-native-async-storage/async-storage';
import { Page, LayoutMetrics } from '../engine/types';
import { Platform } from 'react-native';

const CACHE_PREFIX = 'paginate_v3:';
const CACHE_VERSION = '3.0'; // Bump for final hardening

/**
 * Create deterministic layout hash including ALL typography-affecting properties.
 */
export const createLayoutHash = (sectionId: string, metrics: LayoutMetrics): string => {
    // STRICT: Include all layout-affecting properties
    const parts = [
        sectionId,
        Platform.OS,
        String(Platform.Version), // OS version affects font rendering
        metrics.width.toFixed(1),
        metrics.height.toFixed(1),
        metrics.fontSize.toFixed(1),
        metrics.lineHeight.toFixed(1),
        (metrics.letterSpacing || 0).toFixed(2),
        metrics.fontFamily || 'sys',
        metrics.horizontalPadding.toFixed(1),
        (metrics.verticalPadding || 0).toFixed(1),
        metrics.textAlign || 'left', // Include textAlign
        CACHE_VERSION
    ];
    return parts.join('_');
};

/**
 * Extract short hash for dev overlay display.
 */
export const getShortHash = (hash: string): string => {
    return hash.slice(0, 16) + '...';
};

export const savePaginationCache = async (key: string, sourceFingerprint: string, pages: Page[]) => {
    try {
        const payload = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            sourceFingerprint,
            pages
        };
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
    } catch (e) {
        console.warn('[PaginationCache] Save failed', e);
    }
};

export const loadPaginationCache = async (key: string, expectedFingerprint: string): Promise<Page[] | null> => {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;

        const payload = JSON.parse(raw);

        // 1. Version Check
        if (payload.version !== CACHE_VERSION) {
            console.log(`[PaginationCache] Version mismatch (${payload.version} vs ${CACHE_VERSION}). Invalidating.`);
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        // 2. Source Fingerprint Check
        if (payload.sourceFingerprint !== expectedFingerprint) {
            console.log('[PaginationCache] Content changed. Invalidating.');
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        // 3. Strict Validation
        if (!validatePages(payload.pages)) {
            console.warn('[PaginationCache] Validation failed. Invalidating.');
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return payload.pages;
    } catch (e) {
        console.warn('[PaginationCache] Load failed', e);
        // Safe cleanup on parse error
        try {
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
        } catch { }
        return null;
    }
};

/**
 * Clear all pagination cache (for development/debugging).
 */
export const clearAllPaginationCache = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
            console.log(`[PaginationCache] Cleared ${cacheKeys.length} cached layouts.`);
        }
    } catch (e) {
        console.warn('[PaginationCache] Clear failed', e);
    }
};

/**
 * STRICT VALIDATOR: Enforce contiguous text blocks without gaps or overlaps.
 */
export const validatePages = (pages: any[]): boolean => {
    if (!Array.isArray(pages) || pages.length === 0) return false;

    // Rule: Page 0 must start at 0
    if (pages[0].startOffset !== 0) {
        console.warn('[PaginationCache] Page 0 does not start at offset 0');
        return false;
    }

    let expectedStart = 0;

    for (let i = 0; i < pages.length; i++) {
        const p = pages[i];

        // Rule: Monotonic Index
        if (typeof p.pageIndex !== 'number' || p.pageIndex !== i) {
            console.warn(`[PaginationCache] Page ${i} has wrong pageIndex: ${p.pageIndex}`);
            return false;
        }

        // Rule: Types
        if (typeof p.startOffset !== 'number' || typeof p.endOffset !== 'number') {
            console.warn(`[PaginationCache] Page ${i} missing offset types`);
            return false;
        }
        if (typeof p.contentRaw !== 'string') {
            console.warn(`[PaginationCache] Page ${i} missing contentRaw`);
            return false;
        }

        // Rule: Start < End (Non-empty pages)
        if (p.startOffset >= p.endOffset) {
            console.warn(`[PaginationCache] Page ${i} has invalid range: ${p.startOffset} >= ${p.endOffset}`);
            return false;
        }

        // Rule: Contiguity (No Gaps, No Overlaps)
        if (p.startOffset !== expectedStart) {
            console.warn(`[PaginationCache] Gap at page ${i}: expected ${expectedStart}, got ${p.startOffset}`);
            return false;
        }

        // Rule: Content Length Integrity
        const expectedLen = p.endOffset - p.startOffset;
        if (p.contentRaw.length !== expectedLen) {
            console.warn(`[PaginationCache] Length mismatch at page ${i}. Content: ${p.contentRaw.length}, Range: ${expectedLen}`);
            return false;
        }

        expectedStart = p.endOffset;
    }

    return true;
};
