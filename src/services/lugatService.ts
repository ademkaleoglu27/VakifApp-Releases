import { normalizeText } from './textNormalization';

// In a real app, loading a massive JSON into memory might require optimization (e.g., SQLite or chunked load).
// For this scope (58k words is manageable in modern JS engines, ~2-5MB RAM), import is fine.
// If it grows, we switch to SQLite lookups.
let LUGAT_DATA: Record<string, any[]> | null = null;

export const LugatService = {
    async init() {
        if (LUGAT_DATA) return;
        try {
            // Using require for the bundled asset. 
            // Ensure 'assets/risale_lugat/lugat.json' exists.
            LUGAT_DATA = require('../../assets/risale_lugat/lugat.json');
        } catch (e) {
            console.warn('Lugat data could not be loaded', e);
            LUGAT_DATA = {};
        }
    },

    lookup(word: string) {
        if (!LUGAT_DATA) this.init();
        if (!LUGAT_DATA) return null;

        const key = normalizeText(word);

        // Exact match
        if (LUGAT_DATA[key]) return LUGAT_DATA[key];

        // Try basic stemming fallbacks if not found (very naive)
        // In production, use a real stemmer library or indexed stems.
        // e.g. "aczin" -> not found -> try "acz"

        return null;
    }
};
