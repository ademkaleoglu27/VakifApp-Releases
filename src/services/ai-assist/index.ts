/**
 * AI Assist Module
 * Centralized exports for AI-powered fallback features.
 */

// Normalization
export {
    normalizeToken,
    generateVariants,
    stripTurkishSuffixes,
    levenshteinDistance,
    isArabicText
} from './normalizeToken';

export {
    normalizeQuery,
    normalizeQueryAggressive,
    generateQueryVariants,
    prepareFTSQuery,
    getSearchSuggestions
} from './normalizeQuery';

// Alias Map
export {
    ALIAS_MAP,
    findAliasesFor,
    expandQueryWithAliases,
    getTopAliases
} from './aliasMap';

// Lugat Services
export {
    getLugatSuggestions,
    hasLugatSuggestions,
    getDisplayVariants,
    type LugatSuggestion
} from './LugatSuggestionService';

export {
    getAILugatExplanation,
    clearAILugatCache,
    getAILugatCacheStats,
    type AILugatRequest,
    type AILugatResponse
} from './AILugatService';

// Search Services
export {
    getAlternativeQueries,
    getRelatedTopics,
    shouldShowSuggestions,
    formatSuggestionChip,
    type SearchSuggestion
} from './SearchSuggestionService';

export {
    getAISearchSuggestions,
    clearAISearchCache,
    type AISearchResponse
} from './AISearchService';

// Number Normalization
export {
    expandNumbersInQuery,
    getNumberExpandedVariants,
    hasExpandableNumbers
} from './numberNormalize';
