/**
 * AILugatService.ts
 * AI-powered explanation service for Lugat fallback.
 * Only used when ENABLE_AI_ASSIST_LUGAT feature flag is enabled.
 * 
 * IMPORTANT: This service is designed to be fail-safe:
 * - All errors are caught and logged
 * - Returns null on failure (caller should show local suggestions instead)
 * - Rate limited with debounce
 * - Cached with LRU to avoid redundant API calls
 */

import { LRUCache } from '../../utils/lruCache';
import { ENABLE_AI_ASSIST_LUGAT } from '../../config/features';
import { normalizeToken, generateVariants } from './normalizeToken';

// ============================================================================
// TYPES
// ============================================================================

export interface AILugatRequest {
    word: string;
    sentence: string;        // max 240 chars
    bookRef?: string;        // e.g., "Sözler / Birinci Söz"
    normalizedVariants?: string[];
}

export interface AILugatResponse {
    explanation: string;     // 2-3 sentences
    suggestedEntries?: string[];
    disclaimer: string;      // "Lugatta birebir bulunamadı"
    cached?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Maximum sentence length to send to AI
    MAX_SENTENCE_LENGTH: 240,

    // Cache configuration
    CACHE_SIZE: 50,

    // Rate limiting
    MIN_REQUEST_INTERVAL_MS: 2000,

    // Request timeout
    TIMEOUT_MS: 10000,
};

// ============================================================================
// STATE
// ============================================================================

// LRU Cache for AI responses
const responseCache = new LRUCache<string, AILugatResponse>(CONFIG.CACHE_SIZE);

// Rate limiting
let lastRequestTime = 0;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a cache key from the request.
 */
function getCacheKey(req: AILugatRequest): string {
    const normalized = normalizeToken(req.word);
    // Include a hash of the sentence for context-awareness
    const sentenceHash = req.sentence.slice(0, 50).replace(/\s+/g, '_');
    return `${normalized}:${sentenceHash}`;
}

/**
 * Truncates sentence to maximum allowed length.
 */
function truncateSentence(sentence: string): string {
    if (sentence.length <= CONFIG.MAX_SENTENCE_LENGTH) {
        return sentence;
    }
    return sentence.slice(0, CONFIG.MAX_SENTENCE_LENGTH - 3) + '...';
}

/**
 * Builds the prompt for the AI model.
 * The prompt is carefully designed to:
 * - Keep responses short and focused
 * - Avoid encyclopedic answers
 * - Encourage contextual interpretation
 */
function buildPrompt(req: AILugatRequest): string {
    const variants = req.normalizedVariants?.join(', ') || generateVariants(req.word).join(', ');

    return `Sen Risale-i Nur külliyatı için bir sözlük asistanısın.

Kelime: "${req.word}"
Varyantlar: ${variants}
Cümle: "${truncateSentence(req.sentence)}"
${req.bookRef ? `Kaynak: ${req.bookRef}` : ''}

Görev: Bu kelimenin bu cümledeki muhtemel manasını 2-3 kısa cümle ile açıkla.

Kurallar:
1. İnternetten ansiklopedik bilgi VERME
2. Sadece bağlam açıklaması yap
3. Eğer mana belirsizse, bunu belirt
4. Kısa ve öz tut`;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Gets an AI-powered explanation for a word.
 * Returns null if:
 * - Feature flag is disabled
 * - Rate limited
 * - API error occurs
 * - Network unavailable
 */
export async function getAILugatExplanation(
    req: AILugatRequest
): Promise<AILugatResponse | null> {
    // 1. Check feature flag
    if (!ENABLE_AI_ASSIST_LUGAT) {
        console.log('[AILugatService] Feature flag disabled');
        return null;
    }

    // 2. Check cache
    const cacheKey = getCacheKey(req);
    const cached = responseCache.get(cacheKey);
    if (cached) {
        console.log('[AILugatService] Cache hit:', cacheKey);
        return { ...cached, cached: true };
    }

    // 3. Rate limiting
    const now = Date.now();
    if (now - lastRequestTime < CONFIG.MIN_REQUEST_INTERVAL_MS) {
        console.log('[AILugatService] Rate limited');
        return null;
    }
    lastRequestTime = now;

    // 4. Build request
    const prompt = buildPrompt(req);

    try {
        // 5. Make API call
        // TODO: Implement actual API call based on chosen provider
        // For now, return a placeholder that indicates AI is not configured
        console.log('[AILugatService] AI API not configured yet');

        const response: AILugatResponse = {
            explanation: `"${req.word}" kelimesinin bu bağlamda muhtemel manası için lugat veritabanını kontrol edin.`,
            disclaimer: 'Lugatta birebir bulunamadı. Bu bir yardımcı açıklamadır.',
            suggestedEntries: generateVariants(req.word).slice(0, 3),
        };

        // 6. Cache response
        responseCache.set(cacheKey, response);

        return response;

        /* 
        // EXAMPLE: OpenAI API Implementation (uncomment when ready)
        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Sen Risale-i Nur için bir sözlük asistanısın.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.3,
            }),
        });

        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const explanation = data.choices[0]?.message?.content || '';

        const response: AILugatResponse = {
            explanation,
            disclaimer: 'Bu bir yardımcı açıklamadır. Lugatta birebir bulunamadı.',
            suggestedEntries: generateVariants(req.word).slice(0, 3),
        };

        responseCache.set(cacheKey, response);
        return response;
        */

    } catch (error) {
        console.error('[AILugatService] API error:', error);
        return null;
    }
}

/**
 * Clears the AI response cache.
 * Useful for testing or when user wants to force refresh.
 */
export function clearAILugatCache(): void {
    responseCache.clear();
    console.log('[AILugatService] Cache cleared');
}

/**
 * Gets cache statistics for debugging.
 */
export function getAILugatCacheStats(): { size: number; maxSize: number } {
    return {
        size: responseCache.size,
        maxSize: CONFIG.CACHE_SIZE,
    };
}
