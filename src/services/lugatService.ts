import { normalizeForLugat as normalizeText, getDisplayRoot, foldDiacritics, normalizeForLookup } from '../features/library/utils/lugatNormalize';
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

    /**
     * COMPOUND LOOKUP: Resolves compound AND component entries.
     * Returns both for UI to show "Birleşik" and "Bileşenler" sections.
     * 
     * ENHANCEMENTS:
     * - Display Root: Strips suffixes for title (Kadir-i -> Kadir)
     * - Diacritics Folding: Tries folded variants (â->a) if exact fails
     * - Variants: Max 3 queries per candidate
     */
    async resolveCompoundWithComponents(
        center: string,
        prev?: string,
        next?: string
    ): Promise<{
        compound: DictionaryEntry | null;
        components: DictionaryEntry[];
        searchedWord: string; // The "Display Root"
    }> {
        const components: DictionaryEntry[] = [];
        let compound: DictionaryEntry | null = null;

        // 1. Determine Display Root (Clean Title)
        const displayRoot = getDisplayRoot(center);

        // 2. Generate Compound Candidates
        // Priority: raw+next, then prev+raw
        const compoundCandidates: string[] = [];

        // A. Next Word Candidate (e.g. "Raw-suff" + "Next")
        // If raw is "Kadir-i" or "Zât-ı" (ends with izafet suffix or hyphen)
        if (next && /[-'’][ıiuü]$/i.test(center)) {
            compoundCandidates.push(`${center} ${next}`);
        } else if (next && center.includes('-')) {
            // Hyphenated but maybe not suffix? Try anyway
            compoundCandidates.push(`${center} ${next}`);
        }

        // B. Prev Word Candidate (e.g. "Prev-suff" + "Raw")
        if (prev && /[-'’][ıiuü]$/i.test(prev)) {
            compoundCandidates.push(`${prev} ${center}`);
        }

        // Limit to MAX 1 compound candidate to try (User constraint: "Aynı popup açılışında en fazla 1 compoundCandidate")
        // We prefer (A) Raw+Next if valid, else (B).
        const primaryCandidate = compoundCandidates[0]; // Take first available

        if (primaryCandidate) {
            // Generate Variants for Lookup (Max 3)
            // V1: Normalized (space separated)
            // V2: Dashed
            // V3: Folded

            const base = normalizeForLookup(primaryCandidate, false); // No folding initially
            const variants = [base];

            // Add dashed variant if base has spaces
            if (base.includes(' ')) {
                const dashed = base.replace(/\s+/g, '-');
                if (!variants.includes(dashed)) variants.push(dashed);
            }

            // Add folded variant (diacritics removed)
            const folded = normalizeForLookup(primaryCandidate, true);
            if (!variants.includes(folded)) variants.push(folded);

            // Query DB (limit 3)
            for (const v of variants.slice(0, 3)) {
                const res = await dictionaryDb.searchExact(v);
                if (res) {
                    compound = res;
                    break;
                }
            }
        }

        // 3. Extract Components from Hyphenated Word
        // e.g. "Kadir-i" -> ["Kadir"]
        const hyphenParts = center.split(/[-–—]/);

        for (const part of hyphenParts) {
            const cleanPart = part.trim();
            // Skip izafet connectors: -ı, -i, -u, -ü
            if (/^[ıiuü]$/i.test(cleanPart)) continue;
            if (cleanPart.length < 2) continue;

            // Lookup Component with folding support
            // Try exact, then folded
            let componentEntry = await this.resolveLugatKey(cleanPart);
            if (!componentEntry) {
                // Try folded lookup explicitly if normal failed
                const foldedPart = foldDiacritics(cleanPart);
                if (foldedPart !== cleanPart) {
                    componentEntry = await this.resolveLugatKey(foldedPart);
                }
            }

            if (componentEntry && !components.find(c => c.id === componentEntry.id)) {
                components.push(componentEntry);
            }
        }

        // 4. Special Case: If Next word was part of a potential compound but compound lookup failed,
        // Should we show next word as component? 
        if (primaryCandidate && next && primaryCandidate.includes(next)) {
            const nextEntry = await this.resolveLugatKey(next);
            if (nextEntry && !components.find(c => c.id === nextEntry.id)) {
                components.push(nextEntry);
            }
        }

        return { compound, components, searchedWord: displayRoot };
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
