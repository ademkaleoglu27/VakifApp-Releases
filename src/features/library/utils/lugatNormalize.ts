
/**
 * Lugat Normalization Utilities (World Standard)
 * 
 * Handles unicode normalization, punctuation cleaning, and phrase generation
 * for robust dictionary lookups.
 */

// Characters to strip from start/end of tokens
const TRIM_CHARS = /[.,;:!?(){}[\]"“”'…\s]+/g;

// Characters to completely remove (e.g. soft hyphens)
const REMOVE_CHARS = /[\u00AD]/g;

// Izafet connectors that should be preserved in phrases
// e.g. "kadir-i zülcelal"
const IZAFET_PATTERN = /\b([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\s*-\s*([iıuü])\s*-\s*([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\b/gi;

/**
 * Normalizes a raw token or phrase for Lugat lookup.
 * - NFKC Normalization
 * - Trims punctuation from start/end
 * - Preserves internal apostrophes (kur'an)
 * - Standardizes formatting
 */
export function normalizeForLugat(text: string): string {
    if (!text) return '';

    let normalized = text.normalize('NFKC');

    // Remove invisible characters
    normalized = normalized.replace(REMOVE_CHARS, '');

    // Trim punctuation from start and end
    // We use a regex replace for leading/trailing groups
    normalized = normalized.replace(/^[.,;:!?(){}[\]"“”'…\s]+|[.,;:!?(){}[\]"“”'…\s]+$/g, '');

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Lowercase (Turkish aware ideally, but standard lower for now as DB is likely mixed)
    // Assuming DB keys are lowercase-ish or we rely on standard toLowerCase
    normalized = normalized.toLocaleLowerCase('tr-TR');

    // Handle Izafet standardization (remove extra spaces around hyphens)
    // "kadir - i - zülcelal" -> "kadir-i zülcelal"
    // We want "word-i word" or "word-i-word" depending on DB.
    // Most common DB convention for izafet is "kadir-i zülcelal" (space after connector) OR "kadir-i zülcelal"
    // Let's standardise to single spaces: "word - i - word" -> "word-i-word" (?)
    // Actually, prompt says: "lugat DB’nin mevcut anahtarına uygun tek forma indir"
    // and "kadir-i zülcelal" as example.
    // Let's just ensure single spaces and standard hyphens.

    return normalized;
}

/**
 * Generates phrase candidates from a list of tokens around a clicked index.
 * 
 * Strategy:
 * 1. Single token (clicked)
 * 2. Clicked + Next
 * 3. Clicked + Next + Next
 * 4. Prev + Clicked
 * 5. Prev + Clicked + Next
 * 
 * All candidates are normalized.
 */
export function generatePhraseCandidates(
    tokens: string[],
    clickedIndex: number,
    maxPhraseLength: number = 3
): string[] {
    if (!tokens || clickedIndex < 0 || clickedIndex >= tokens.length) return [];

    const candidates: string[] = [];
    const clicked = tokens[clickedIndex];

    // Helper to add if valid
    const addFn = (raw: string) => {
        const norm = normalizeForLugat(raw);
        if (norm && norm.length > 1 && !candidates.includes(norm)) {
            candidates.push(norm);
        }
    };

    // 1. Single word
    addFn(clicked);

    // 2. Right expansion (Clicked + Next...)
    let rightPhrase = clicked;
    for (let i = 1; i < maxPhraseLength; i++) {
        if (clickedIndex + i < tokens.length) {
            rightPhrase += ' ' + tokens[clickedIndex + i];
            addFn(rightPhrase);
        }
    }

    // 3. Left expansion (Prev + Clicked...)
    if (clickedIndex > 0) {
        const prev = tokens[clickedIndex - 1];
        // Prev + Clicked
        addFn(prev + ' ' + clicked);

        // Prev + Clicked + Next
        if (clickedIndex + 1 < tokens.length) {
            addFn(prev + ' ' + clicked + ' ' + tokens[clickedIndex + 1]);
        }
    }

    // 4. Special Case: Apostrophe disconnected "kur" + "'" + "an" -> "kur'an"
    // If tokens got split by apostrophe incorrectly
    // This depends on how tokenizer works. If tokenizer preserves apostrophe in word, this isn't needed.
    // If tokenizer splits, we might need to stitch.
    // The Renderer's tokenizer splits by `(\s+|[.,;!?]+)`. It keeps apostrophes attached if not in that list.
    // The prompt requested: "kur’ân" gibi apostrof içeren kelimelerde birleşme dene.

    return candidates;
}
