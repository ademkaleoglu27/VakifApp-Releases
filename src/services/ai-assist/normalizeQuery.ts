/**
 * normalizeQuery.ts
 * Search query normalizer for FTS matching.
 * 
 * Pipeline:
 * 1. Lowercase
 * 2. Remove punctuation
 * 3. Normalize whitespace
 * 4. Optionally expand with aliases
 */

import { normalizeToken, stripTurkishSuffixes } from './normalizeToken';
import { expandQueryWithAliases } from './aliasMap';

/**
 * Normalizes a search query for FTS matching.
 * Cleans up the query while preserving search intent.
 */
export function normalizeQuery(query: string): string {
    if (!query) return '';

    let normalized = query;

    // 1. Lowercase with Turkish locale
    normalized = normalized.toLocaleLowerCase('tr-TR');

    // 2. Remove punctuation except hyphen (for compound words like ehl-i iman)
    normalized = normalized.replace(/[.,;:!?"""\[\]{}()]/g, ' ');

    // 3. Normalize apostrophes to nothing (for words like Kur'an → Kuran)
    normalized = normalized.replace(/[''ʿʾ`´ʼ]/g, '');

    // 4. Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Normalizes a query and also strips Turkish suffixes from each word.
 * More aggressive normalization for when exact match fails.
 */
export function normalizeQueryAggressive(query: string): string {
    const normalized = normalizeQuery(query);
    const words = normalized.split(' ');

    const strippedWords = words.map(word => {
        // Only strip suffixes from words longer than 3 chars
        if (word.length > 3) {
            return stripTurkishSuffixes(word);
        }
        return word;
    });

    return strippedWords.join(' ');
}

/**
 * Generates a list of query variants for fuzzy searching.
 * Includes: normalized, suffix-stripped, and alias-expanded versions.
 */
export function generateQueryVariants(query: string): string[] {
    const variants = new Set<string>();

    // 1. Original (normalized)
    const normalized = normalizeQuery(query);
    variants.add(normalized);

    // 2. Suffix-stripped version
    const stripped = normalizeQueryAggressive(query);
    if (stripped !== normalized) {
        variants.add(stripped);
    }

    // 3. Alias-expanded versions
    const aliasExpanded = expandQueryWithAliases(normalized);
    aliasExpanded.forEach(v => variants.add(v));

    // 4. Also expand the suffix-stripped version if different
    if (stripped !== normalized) {
        const strippedExpanded = expandQueryWithAliases(stripped);
        strippedExpanded.forEach(v => variants.add(v));
    }

    return Array.from(variants);
}

/**
 * Prepares a query for FTS5 MATCH syntax.
 * Wraps each word in quotes and adds prefix matching.
 */
export function prepareFTSQuery(query: string): string {
    const normalized = normalizeQuery(query);
    if (!normalized) return '""';

    const words = normalized.split(' ').filter(w => w.length > 0);

    // Use phrase matching for multi-word queries, prefix for single words
    if (words.length === 1) {
        return `"${words[0]}"*`;
    }

    // For multi-word: use AND between quoted words with prefix
    return words.map(w => `"${w}"*`).join(' AND ');
}

/**
 * Generates alternative search suggestions when primary search fails.
 * Returns a list of query strings the user might want to try.
 */
export function getSearchSuggestions(query: string, limit: number = 5): string[] {
    const suggestions: string[] = [];
    const normalized = normalizeQuery(query);

    // 1. Suffix-stripped version
    const stripped = normalizeQueryAggressive(query);
    if (stripped !== normalized && stripped.length >= 2) {
        suggestions.push(stripped);
    }

    // 2. Alias expansions
    const aliasExpanded = expandQueryWithAliases(normalized);
    for (const expanded of aliasExpanded) {
        if (expanded !== normalized && suggestions.length < limit) {
            suggestions.push(expanded);
        }
    }

    // 3. If stripped version has different aliases
    if (stripped !== normalized) {
        const strippedAliases = expandQueryWithAliases(stripped);
        for (const expanded of strippedAliases) {
            if (expanded !== stripped && expanded !== normalized && suggestions.length < limit) {
                suggestions.push(expanded);
            }
        }
    }

    return suggestions.slice(0, limit);
}
