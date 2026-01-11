import { normalizeText } from './textNormalization';
import { dictionaryDb, DictionaryEntry } from './dictionaryDb';

const SUFFIXES = [
    // Verbs / Gerunds
    "edip", "edib", "yip", "yıp", "yup", "yüp",
    "erek", "arak", "ip", "ıp", "up", "üp",
    "ince", "ınca", "ken",
    // Copula
    "dir", "dır", "dur", "dür", "tir", "tır", "tur", "tür",
    // Ablative / Dative / Locative
    "dan", "den", "tan", "ten", "da", "de", "ta", "te", "a", "e",
    // Genitive / Possessive (Added si/sı/su/sü for 'ebedisi')
    "nın", "nin", "nun", "nün", "ın", "in", "un", "ün",
    "mız", "miz", "muz", "müz", "nız", "niz", "nuz", "nüz",
    "sı", "si", "su", "sü",
    "ı", "i", "u", "ü", "m", "n",
    // Plural
    "lar", "ler"
];

// Sort for longest match once
SUFFIXES.sort((a, b) => b.length - a.length);

export const LugatService = {
    // Wrapper for unified search logic
    async search(word: string): Promise<DictionaryEntry | null> {
        return this.resolveLugatKey(word);
    },

    // Multi-word Resolver (Diamond Standard V21.1)
    async resolveMultiWordKey(center: string, prev?: string, next?: string): Promise<DictionaryEntry | null> {
        const cleanCenter = normalizeText(center);

        const candidates: string[] = [];

        // 1. Three Words (Prev + Center + Next)
        if (prev && next) {
            const cleanPrev = normalizeText(prev);
            const cleanNext = normalizeText(next);
            candidates.push(`${cleanPrev} ${cleanCenter} ${cleanNext}`);
        }

        // 2. Two Words (Prev + Center)
        if (prev) {
            const cleanPrev = normalizeText(prev);
            candidates.push(`${cleanPrev} ${cleanCenter}`);
        }

        // 3. Two Words (Center + Next)
        if (next) {
            const cleanNext = normalizeText(next);
            candidates.push(`${cleanCenter} ${cleanNext}`);
        }

        // Check Multi-word Candidates explicitly
        for (const candidate of candidates) {
            const result = await dictionaryDb.searchExact(candidate);
            if (result) return result; // Found compound!
        }

        // Fallback: Single Word Resolution
        return this.resolveLugatKey(center);
    },

    async resolveLugatKey(surface: string): Promise<DictionaryEntry | null> {
        // 1. Exact Normalization
        const cleanBase = normalizeText(surface);

        // Candidates Generation
        const candidates: string[] = [];
        candidates.push(cleanBase);

        // Candidate 2: Apostrophe Split
        if (surface.includes("'") || surface.includes("’")) {
            const split = surface.split(/['’]/)[0];
            candidates.push(normalizeText(split));
        }

        // Candidate 3: Hyphen Split
        if (surface.includes("-")) {
            const split = surface.split("-")[0];
            candidates.push(normalizeText(split));
        }

        // Processing Candidates
        for (const candidate of candidates) {
            if (!candidate || candidate.length < 2) continue;

            // A. Check Existence
            let res = await dictionaryDb.searchExact(candidate);
            if (res) return res;

            // B. Suffix Stripping
            let current = candidate;
            const maxDepth = 4;
            for (let i = 0; i < maxDepth; i++) {
                const stripped = this.stripSuffix(current);
                if (stripped === current) break;

                res = await dictionaryDb.searchExact(stripped);
                if (res) return res;

                current = stripped;
            }
        }

        return null; // No entry found
    },

    async searchWithKey(key: string): Promise<DictionaryEntry | null> {
        return dictionaryDb.searchDefinition(key);
    },

    stripSuffix(word: string): string {
        for (const s of SUFFIXES) {
            // 1. Standard Attached Suffix
            if (word.endsWith(s) && word.length > s.length + 2) {
                // Check valid root length
                // TRIM is crucial here: normalization might leave space (e.g. "malik i" -> strip "i" -> "malik ")
                return word.slice(0, -s.length).trim();
            }
            // 2. Izofet Suffix (Space separated due to normalized hyphen)
            // e.g. "malik i" -> "malik"
            const izofet = ' ' + s;
            if (word.endsWith(izofet)) {
                const root = word.slice(0, -izofet.length).trim();
                if (root.length > 2) return root;
            }
        }
        return word;
    }
};
