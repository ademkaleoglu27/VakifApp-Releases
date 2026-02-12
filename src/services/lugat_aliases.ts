import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from './supabaseClient';

// ── Phase 1: Static Aliases (never removed, always available) ──
const STATIC_ALIASES: Record<string, string> = {
    "düşman": "hasım",
    "dusman": "hasım",
    "savaş": "harb",
    "barış": "sulh",
    "örnek": "misal",
    "örneğin": "mesela",
    "kanıt": "delil",
    "doğa": "tabiat",
    "yüzyıl": "asır",
    "cevap": "cevab",
    "soru": "sual",
    "neden": "sebeb",
    "sonuç": "netice",
    "amaç": "gaye",
    "sonsuz": "ebedi",
    "kutsal": "mukaddes",
    "beden": "ceset",
    "kalp": "kalb",
    "namaz": "salat",
    "oruç": "savm",
    "peygamber": "resul",
};

// ── Phase 2: Dynamic Aliases (fetched from Supabase) ──
const CACHE_KEY = 'lugat_dynamic_aliases';
let dynamicAliases: Record<string, string> = {};
let syncDone = false;

/**
 * Sync dynamic aliases from Supabase. 
 * Falls back to cached version if offline.
 * Safe to call multiple times; only fetches once per session.
 */
export const syncDynamicAliases = async (): Promise<void> => {
    if (syncDone) return;

    // 1. Load from local cache first (instant, offline-safe)
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            dynamicAliases = JSON.parse(cached);
            console.log(`[Lugat] Loaded ${Object.keys(dynamicAliases).length} dynamic aliases from cache.`);
        }
    } catch (e) {
        console.warn('[Lugat] Cache read failed:', e);
    }

    // 2. Try to fetch fresh data from Supabase
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.log('[Lugat] No Supabase client, using cache only.');
            syncDone = true;
            return;
        }

        const { data, error } = await supabase
            .from('lugat_mappings')
            .select('source_word, target_word');

        if (error) {
            // Table might not exist yet - this is fine, just use static + cache
            console.warn('[Lugat] Supabase fetch warning:', error.message);
            syncDone = true;
            return;
        }

        if (data && data.length > 0) {
            const fresh: Record<string, string> = {};
            for (const row of data) {
                fresh[row.source_word.toLowerCase()] = row.target_word.toLowerCase();
            }
            dynamicAliases = fresh;

            // Save to local cache for offline use
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
            console.log(`[Lugat] Synced ${data.length} dynamic aliases from cloud.`);
        }
    } catch (e) {
        console.warn('[Lugat] Sync error (non-fatal):', e);
    }

    syncDone = true;
};

/**
 * Check if a word has an alias mapping.
 * Priority: Dynamic (cloud) > Static (hardcoded)
 */
export const checkAlias = (word: string): string | null => {
    const lower = word.toLocaleLowerCase('tr-TR').trim();

    // 1. Check dynamic aliases first (cloud-managed)
    if (dynamicAliases[lower]) {
        return dynamicAliases[lower];
    }

    // 2. Fallback to static aliases (always available)
    return STATIC_ALIASES[lower] || null;
};

// Re-export for backward compatibility
export const LUGAT_ALIASES = STATIC_ALIASES;
