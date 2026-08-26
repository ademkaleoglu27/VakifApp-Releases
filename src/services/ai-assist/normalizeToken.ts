/**
 * normalizeToken.ts
 * Turkish-aware token normalizer for Lugat lookup.
 * 
 * Pipeline:
 * 1. Lowercase (tr-TR locale)
 * 2. Remove apostrophes and hamza marks
 * 3. Strip diacritics (hakîkat → hakikat)
 * 4. Trim Turkish suffixes (insanın → insan)
 * 5. Generate variants (ehli iman ↔ ehl-i iman)
 */

// Turkish suffix patterns for stripping
const TURKISH_SUFFIXES = [
    // Genitive (tamlayan eki)
    /nın$/i, /nin$/i, /nun$/i, /nün$/i,
    /ın$/i, /in$/i, /un$/i, /ün$/i,

    // Accusative (belirtme eki)
    /yı$/i, /yi$/i, /yu$/i, /yü$/i,
    /ı$/i, /i$/i, /u$/i, /ü$/i,

    // Dative (yönelme eki)
    /ya$/i, /ye$/i,
    /a$/i, /e$/i,

    // Locative (bulunma eki)
    /da$/i, /de$/i, /ta$/i, /te$/i,

    // Ablative (ayrılma eki)
    /dan$/i, /den$/i, /tan$/i, /ten$/i,

    // Possessive (iyelik eki)
    /ımız$/i, /imiz$/i, /umuz$/i, /ümüz$/i,
    /ınız$/i, /iniz$/i, /unuz$/i, /ünüz$/i,
    /ları$/i, /leri$/i,
    /ım$/i, /im$/i, /um$/i, /üm$/i,

    // Plural (çoğul eki) - process last as many words end naturally
    /lar$/i, /ler$/i,
];

// Words that should NOT have suffixes stripped (false positives)
// These words naturally end with suffix-like patterns
const SUFFIX_STRIP_EXCEPTIONS = new Set([
    // Words ending in -an/-en (look like locative suffix)
    'insan', 'iman', 'zaman', 'beyan', 'sultan', 'rahman', 'furkan',
    'şeytan', 'burhan', 'ilan', 'cihan', 'meydan', 'ferman', 'rıdvan',
    'vicdan', 'imkan', 'nisan', 'ramazan', 'kuran', 'kur\'an', 'irfan',
    'ihsan', 'heyecan', 'ihtikan', 'hayvan', 'divan', 'pehlivan',
    // Words ending in -er/-ar (look like plural)
    'beşer', 'haber', 'kader', 'asker', 'sefer', 'zafer', 'defter',
    'kalender', 'münker', 'şer', 'hayır', 'sabır', 'kabir', 'fakir',
    // Words ending in -et/-at (important theological terms)
    'hakikat', 'marifet', 'hikmet', 'kudret', 'rahmet', 'nimet', 'ibadet',
    'şefkat', 'musibet', 'haslet', 'meziyet', 'fazilet', 'keramet',
    'insaniyet', 'beşeriyet', 'medeniyet', 'mesuliyet', 'ehliyet',
    // Words ending in other patterns
    'sair', 'zahir', 'batın', 'sadır', 'nazir', 'malik', 'melik',
    'şükür', 'zikir', 'fikir', 'tefekkür', 'tevekkül', 'tevhid',
]);

// Diacritics mapping for normalization
const DIACRITICS_MAP: Record<string, string> = {
    'â': 'a', 'Â': 'a',
    'î': 'i', 'Î': 'i',
    'û': 'u', 'Û': 'u',
    'ê': 'e', 'Ê': 'e',
    'ô': 'o', 'Ô': 'o',
    'ā': 'a', 'ī': 'i', 'ū': 'u',
};

// Apostrophe and hamza variants
const APOSTROPHE_CHARS = /[''ʿʾ`´ʼ]/g;

/**
 * Normalizes a single token for Lugat lookup.
 * Returns the base form suitable for dictionary matching.
 */
export function normalizeToken(token: string): string {
    if (!token) return '';

    let normalized = token;

    // 1. Lowercase with Turkish locale
    normalized = normalized.toLocaleLowerCase('tr-TR');

    // 2. Remove apostrophes and hamza marks
    normalized = normalized.replace(APOSTROPHE_CHARS, '');

    // 3. Strip diacritics (circumflex vowels)
    for (const [diacritic, replacement] of Object.entries(DIACRITICS_MAP)) {
        normalized = normalized.split(diacritic).join(replacement);
    }

    // 4. Remove punctuation
    normalized = normalized.replace(/[.,;:!?"""\-()[\]{}]/g, '');

    // 5. Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Strips Turkish suffixes from a token to get the root form.
 * Uses conservative approach to avoid over-stripping.
 */
export function stripTurkishSuffixes(token: string): string {
    if (!token || token.length < 4) return token;

    // Don't strip from known exception words
    const normalized = normalizeToken(token);
    if (SUFFIX_STRIP_EXCEPTIONS.has(normalized)) {
        return normalized;
    }

    let result = normalized;
    let prevResult = '';

    // Iterate until no more suffixes can be stripped (max 3 iterations for safety)
    let iterations = 0;
    while (result !== prevResult && iterations < 3) {
        prevResult = result;
        for (const suffix of TURKISH_SUFFIXES) {
            if (suffix.test(result) && result.length > 3) {
                const stripped = result.replace(suffix, '');
                // Only accept if remaining word is at least 2 chars
                if (stripped.length >= 2) {
                    result = stripped;
                    break; // Strip one suffix per iteration
                }
            }
        }
        iterations++;
    }

    return result;
}

/**
 * Generates variant forms of a token for fuzzy matching.
 * Includes: normalized form, suffix-stripped form, diacritic variants, etc.
 */
export function generateVariants(token: string): string[] {
    const variants = new Set<string>();
    const normalized = normalizeToken(token);

    if (!normalized) return [];

    // 1. Add normalized form
    variants.add(normalized);

    // 2. Add suffix-stripped form
    const stripped = stripTurkishSuffixes(token);
    if (stripped !== normalized) {
        variants.add(stripped);
    }

    // 3. Add diacritic variations (add back circumflex)
    // e.g., 'hakikat' → 'hakîkat'
    const diacriticVariants = generateDiacriticVariants(normalized);
    diacriticVariants.forEach(v => variants.add(v));

    // 4. Add hyphen/space variants
    // e.g., 'ehli iman' ↔ 'ehl-i iman' ↔ 'ehliman'
    if (normalized.includes(' ')) {
        // "ehli iman" → "ehl-i iman"
        variants.add(normalized.replace(' ', '-'));
        // "ehli iman" → "ehliiman"
        variants.add(normalized.replace(/\s+/g, ''));
    }
    if (normalized.includes('-')) {
        // "ehl-i iman" → "ehli iman"
        variants.add(normalized.replace('-', ' '));
        // "ehl-i iman" → "ehliiman"
        variants.add(normalized.replace(/-/g, ''));
    }

    // 5. Add common Ottoman "i" pattern variants
    // e.g., "ehl-i iman" ↔ "ehli iman"
    if (normalized.includes('-i ')) {
        variants.add(normalized.replace(/-i /g, 'i '));
    }
    if (/i\s/.test(normalized)) {
        // Try inserting hyphen: "ehli iman" → "ehl-i iman"
        const parts = normalized.split(/\s+/);
        if (parts.length >= 2 && parts[0].endsWith('i')) {
            const modified = parts[0].slice(0, -1) + '-i ' + parts.slice(1).join(' ');
            variants.add(modified);
        }
    }

    return Array.from(variants);
}

/**
 * Generates diacritic variants by adding/removing circumflex vowels.
 * Common patterns in Ottoman Turkish: â, î, û
 */
function generateDiacriticVariants(token: string): string[] {
    const variants: string[] = [];

    // Pattern: 'a' at specific positions might be 'â'
    // Common words: hakîkat, âlem, kâinat, etc.
    const vowelPositions: Array<{ char: string; diacritic: string }> = [
        { char: 'a', diacritic: 'â' },
        { char: 'i', diacritic: 'î' },
        { char: 'u', diacritic: 'û' },
    ];

    for (const { char, diacritic } of vowelPositions) {
        if (token.includes(char)) {
            // Generate variant with diacritic at each occurrence
            // This is conservative - only first occurrence
            const firstIndex = token.indexOf(char);
            if (firstIndex !== -1) {
                const variant = token.slice(0, firstIndex) + diacritic + token.slice(firstIndex + 1);
                if (variant !== token) {
                    variants.push(variant);
                }
            }
        }
    }

    return variants;
}

/**
 * Checks if a token is likely Arabic text.
 */
export function isArabicText(token: string): boolean {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    return arabicRegex.test(token);
}

/**
 * Gets the minimum edit distance (Levenshtein distance) between two strings.
 * Used for fuzzy matching when normalized variants don't match.
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}
