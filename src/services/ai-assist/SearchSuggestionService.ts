/**
 * SearchSuggestionService.ts
 * Local (offline) suggestion engine for Search fallback.
 * Generates alternative search queries when primary search returns empty.
 */

import { normalizeQuery, getSearchSuggestions } from './normalizeQuery';
import { findAliasesFor, getTopAliases } from './aliasMap';
import { stripTurkishSuffixes, normalizeToken } from './normalizeToken';

export interface SearchSuggestion {
    query: string;
    matchType: 'alias' | 'variant' | 'stripped';
    displayLabel?: string;
}

/**
 * Generates alternative query suggestions when search returns no results.
 * 
 * Pipeline:
 * 1. Normalize the query
 * 2. Strip Turkish suffixes
 * 3. Expand with aliases
 * 4. Generate variant forms
 */
export function getAlternativeQueries(query: string, limit: number = 5): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();
    const normalized = normalizeQuery(query);

    if (!normalized || normalized.length < 2) {
        return [];
    }

    seen.add(normalized);

    // 1. Try suffix-stripped version
    const words = normalized.split(' ');
    const strippedWords = words.map(w => w.length > 3 ? stripTurkishSuffixes(w) : w);
    const stripped = strippedWords.join(' ');

    if (stripped !== normalized && !seen.has(stripped)) {
        seen.add(stripped);
        suggestions.push({
            query: stripped,
            matchType: 'stripped',
            displayLabel: stripped
        });
    }

    // 2. Find aliases for each word
    for (const word of words) {
        const aliases = getTopAliases(normalizeToken(word), 3);
        for (const alias of aliases) {
            const newQuery = normalized.replace(word, alias);
            if (!seen.has(newQuery)) {
                seen.add(newQuery);
                suggestions.push({
                    query: newQuery,
                    matchType: 'alias',
                    displayLabel: alias
                });
            }
            if (suggestions.length >= limit) break;
        }
        if (suggestions.length >= limit) break;
    }

    // 3. Also try aliases for the stripped version
    if (stripped !== normalized && suggestions.length < limit) {
        for (const word of strippedWords) {
            const aliases = getTopAliases(normalizeToken(word), 2);
            for (const alias of aliases) {
                const newQuery = stripped.replace(word, alias);
                if (!seen.has(newQuery)) {
                    seen.add(newQuery);
                    suggestions.push({
                        query: newQuery,
                        matchType: 'alias',
                        displayLabel: alias
                    });
                }
                if (suggestions.length >= limit) break;
            }
            if (suggestions.length >= limit) break;
        }
    }

    return suggestions.slice(0, limit);
}

/**
 * Gets related topic suggestions for a search query.
 * These are broader topic areas that might contain relevant content.
 */
export function getRelatedTopics(query: string, limit: number = 3): string[] {
    const normalized = normalizeQuery(query);
    const topics = new Set<string>();

    // Extract main concepts from the query using alias map
    const words = normalized.split(' ');
    for (const word of words) {
        const aliases = findAliasesFor(normalizeToken(word));
        // Add some aliases as related topics
        aliases.slice(0, 2).forEach(a => topics.add(a));
    }

    return Array.from(topics).slice(0, limit);
}

/**
 * Checks if a query should trigger fallback suggestions.
 * Returns true if the query is likely to benefit from suggestions.
 */
export function shouldShowSuggestions(query: string): boolean {
    const normalized = normalizeQuery(query);

    // Skip very short queries
    if (normalized.length < 2) return false;

    // Skip if it's just numbers
    if (/^\d+$/.test(normalized)) return false;

    return true;
}

/**
 * Formats a suggestion for display as a chip.
 * Optionally highlights the changed part.
 */
export function formatSuggestionChip(
    suggestion: SearchSuggestion,
    originalQuery: string
): { text: string; highlight?: string } {
    const { query, matchType, displayLabel } = suggestion;

    if (matchType === 'alias' && displayLabel) {
        return {
            text: query,
            highlight: displayLabel
        };
    }

    return { text: query };
}
