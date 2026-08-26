/**
 * LugatSuggestionService.ts
 * Local (offline) suggestion engine for Lugat fallback.
 * Generates suggestions when exact dictionary match fails.
 */

import { dictionaryDb, DictionaryEntry } from '../dictionaryDb';
import {
    normalizeToken,
    generateVariants,
    stripTurkishSuffixes,
    levenshteinDistance
} from './normalizeToken';
import { findAliasesFor } from './aliasMap';

export interface LugatSuggestion {
    entry: DictionaryEntry;
    score: number;
    matchType: 'exact' | 'normalized' | 'variant' | 'alias' | 'fuzzy';
}

/**
 * Generates up to N suggestions when exact match fails.
 * 
 * Pipeline:
 * 1. Normalize input token
 * 2. Generate variants (diacritics, suffixes, hyphenation)
 * 3. Query DB for each variant
 * 4. Check alias map for semantic alternatives
 * 5. Fuzzy match remaining candidates
 * 6. Rank by score and return top N
 */
export async function getLugatSuggestions(
    token: string,
    limit: number = 5
): Promise<LugatSuggestion[]> {
    const suggestions: Map<number, LugatSuggestion> = new Map();

    if (!token || token.length < 2) {
        return [];
    }

    try {
        // 1. Try exact match first (already done by caller, but double-check)
        const exactResult = await dictionaryDb.searchExact(token);
        if (exactResult) {
            suggestions.set(exactResult.id, {
                entry: exactResult,
                score: 100,
                matchType: 'exact'
            });
        }

        // 2. Try normalized form
        const normalized = normalizeToken(token);
        if (normalized !== token.toLowerCase()) {
            const normalizedResult = await dictionaryDb.searchExact(normalized);
            if (normalizedResult && !suggestions.has(normalizedResult.id)) {
                suggestions.set(normalizedResult.id, {
                    entry: normalizedResult,
                    score: 95,
                    matchType: 'normalized'
                });
            }
        }

        // 3. Try suffix-stripped form
        const stripped = stripTurkishSuffixes(token);
        if (stripped !== normalized && stripped.length >= 2) {
            const strippedResult = await dictionaryDb.searchExact(stripped);
            if (strippedResult && !suggestions.has(strippedResult.id)) {
                suggestions.set(strippedResult.id, {
                    entry: strippedResult,
                    score: 90,
                    matchType: 'variant'
                });
            }
        }

        // 4. Try generated variants
        const variants = generateVariants(token);
        for (const variant of variants) {
            if (suggestions.size >= limit * 2) break; // Collect more than needed for ranking

            const variantResult = await dictionaryDb.searchExact(variant);
            if (variantResult && !suggestions.has(variantResult.id)) {
                suggestions.set(variantResult.id, {
                    entry: variantResult,
                    score: 85,
                    matchType: 'variant'
                });
            }
        }

        // 5. Try alias-based suggestions
        const aliases = findAliasesFor(normalized);
        for (const alias of aliases.slice(0, 5)) {
            if (suggestions.size >= limit * 2) break;

            const aliasResult = await dictionaryDb.searchExact(alias);
            if (aliasResult && !suggestions.has(aliasResult.id)) {
                suggestions.set(aliasResult.id, {
                    entry: aliasResult,
                    score: 75,
                    matchType: 'alias'
                });
            }
        }

        // 6. Fuzzy search with prefix matching
        if (suggestions.size < limit) {
            const fuzzyResults = await dictionaryDb.search(normalized);
            for (const entry of fuzzyResults.slice(0, 10)) {
                if (suggestions.has(entry.id)) continue;

                // Calculate fuzzy score based on edit distance
                const distance = levenshteinDistance(
                    normalized,
                    normalizeToken(entry.word_tr)
                );
                const maxLen = Math.max(normalized.length, entry.word_tr.length);
                const similarity = maxLen > 0 ? (1 - distance / maxLen) * 100 : 0;

                // Only include if reasonably similar (>40% match)
                if (similarity > 40) {
                    suggestions.set(entry.id, {
                        entry,
                        score: Math.round(similarity * 0.6), // Scale down fuzzy scores
                        matchType: 'fuzzy'
                    });
                }
            }
        }

        // 7. Sort by score and return top N
        const sorted = Array.from(suggestions.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return sorted;
    } catch (error) {
        console.error('[LugatSuggestionService] Error:', error);
        return [];
    }
}

/**
 * Quick check if a token has likely dictionary matches.
 * Useful for UI to decide whether to show "Öneriler" section.
 */
export async function hasLugatSuggestions(token: string): Promise<boolean> {
    const suggestions = await getLugatSuggestions(token, 1);
    return suggestions.length > 0;
}

/**
 * Gets normalized variants of a token for display.
 * Useful for showing "Aranan varyantlar: ..." in UI.
 */
export function getDisplayVariants(token: string): string[] {
    const variants = generateVariants(token);
    const aliases = findAliasesFor(normalizeToken(token));

    return Array.from(new Set([...variants, ...aliases])).slice(0, 8);
}
