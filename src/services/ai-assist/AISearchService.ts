/**
 * AISearchService.ts
 * AI-powered search suggestion service.
 * Only used when ENABLE_AI_ASSIST_SEARCH feature flag is enabled.
 */

import { LRUCache } from '../../utils/lruCache';
import { ENABLE_AI_ASSIST_SEARCH } from '../../config/features';
import { normalizeQuery } from './normalizeQuery';

// ============================================================================
// TYPES
// ============================================================================

export interface AISearchResponse {
    alternativeQueries: string[];  // Up to 5
    relatedTopics: string[];       // Up to 3
    disclaimer: string;
    cached?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    CACHE_SIZE: 30,
    MIN_REQUEST_INTERVAL_MS: 2000,
    TIMEOUT_MS: 8000,
};

// ============================================================================
// STATE
// ============================================================================

const responseCache = new LRUCache<string, AISearchResponse>(CONFIG.CACHE_SIZE);
let lastRequestTime = 0;

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Gets AI-powered search suggestions.
 * Returns null if feature flag is disabled or on error.
 */
export async function getAISearchSuggestions(
    query: string
): Promise<AISearchResponse | null> {
    // 1. Check feature flag
    if (!ENABLE_AI_ASSIST_SEARCH) {
        console.log('[AISearchService] Feature flag disabled');
        return null;
    }

    const normalized = normalizeQuery(query);
    if (!normalized || normalized.length < 2) {
        return null;
    }

    // 2. Check cache
    const cached = responseCache.get(normalized);
    if (cached) {
        console.log('[AISearchService] Cache hit:', normalized);
        return { ...cached, cached: true };
    }

    // 3. Rate limiting
    const now = Date.now();
    if (now - lastRequestTime < CONFIG.MIN_REQUEST_INTERVAL_MS) {
        console.log('[AISearchService] Rate limited');
        return null;
    }
    lastRequestTime = now;

    try {
        // 4. Make API call
        // TODO: Implement actual API call
        console.log('[AISearchService] AI API not configured yet');

        // Placeholder response
        const response: AISearchResponse = {
            alternativeQueries: [],
            relatedTopics: [],
            disclaimer: 'AI arama önerileri şu an kullanılamıyor.',
        };

        responseCache.set(normalized, response);
        return response;

    } catch (error) {
        console.error('[AISearchService] API error:', error);
        return null;
    }
}

/**
 * Clears the AI search cache.
 */
export function clearAISearchCache(): void {
    responseCache.clear();
}
