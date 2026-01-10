import { normalizeText } from './textNormalization';
import { dictionaryDb, DictionaryEntry } from './dictionaryDb';

export const LugatService = {
    // Wrapper for unified search logic
    // Now uses SQLite instead of JSON to ensure consistency with UI Card
    async search(word: string): Promise<DictionaryEntry | null> {
        // 1. Exact / Normalized
        let candidate = normalizeText(word);

        // V13 Logic: Hybrid Recursive Stemming
        // Phrases (with spaces) -> Max 1 Strip (Prevent Mangling)
        // Words -> Max 4 Strip (Depp Root Seeking)

        const isPhrase = candidate.includes(' ');
        const maxDepth = isPhrase ? 1 : 4;

        let current = candidate;

        // 1. Check initial form
        let res = await dictionaryDb.searchDefinition(current);
        if (res) return res;

        for (let i = 0; i < maxDepth; i++) {
            // Strip Suffix
            const stripped = this.stripSuffix(current);
            if (stripped === current) break; // No more suffixes found

            // Check stripped form
            res = await dictionaryDb.searchDefinition(stripped);
            if (res) return res;

            current = stripped;
        }

        return null;
    },

    stripSuffix(word: string): string {
        // Reverse sort by length to match longest suffix first
        // Suffixes: Case, Plural, Possessive, Copula
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

        // Sort for longest match
        SUFFIXES.sort((a, b) => b.length - a.length);

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
