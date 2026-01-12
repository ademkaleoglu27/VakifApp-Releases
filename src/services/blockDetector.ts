/**
 * blockDetector.ts (V1.0 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * Arabic block detection and atomicity classification for Risale content.
 * 
 * Rules:
 * - Arabic ≥12 chars OR ≥2 words with harakah → arabic_block (atomic)
 * - Turkish ≤2 words adjacent to arabic_block → merge candidate
 * - Headings, labels, dividers → always atomic
 * 
 * LOCKED: Core detection logic. Do not modify thresholds without testing.
 * ─────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type BlockType = 'paragraph' | 'arabic_block' | 'heading' | 'label' | 'divider' | 'footnote' | 'poetry';
export type Atomicity = 'splittable' | 'atomic';
export type Language = 'tr' | 'ar' | 'mixed';

export interface BlockClassification {
    type: BlockType;
    atomicity: Atomicity;
    lang: Language;
    isShortFragment: boolean;  // True if ≤2 words (merge candidate)
    arabicRatio: number;       // 0-1, percentage of Arabic chars
}

export interface ParsedBlock {
    id: string;
    text: string;
    originalType: string;
    originalLang?: string;
    classification: BlockClassification;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS & THRESHOLDS
// ─────────────────────────────────────────────────────────────

// Arabic Unicode ranges
const ARABIC_RANGES = [
    [0x0600, 0x06FF],  // Arabic
    [0x0750, 0x077F],  // Arabic Supplement
    [0x08A0, 0x08FF],  // Arabic Extended-A
    [0xFB50, 0xFDFF],  // Arabic Presentation Forms-A
    [0xFE70, 0xFEFF],  // Arabic Presentation Forms-B
];

// Harakah (diacritics) range - indicates Quranic/formal Arabic
const HARAKAH_RANGE = [0x064B, 0x0652];  // Fathah to Sukun

// Thresholds
const ARABIC_BLOCK_MIN_CHARS = 12;      // Minimum Arabic chars for block classification
const ARABIC_BLOCK_MIN_WORDS = 2;       // Minimum words with harakah
const ARABIC_RATIO_THRESHOLD = 0.65;    // 65% Arabic = arabic_block
const SHORT_FRAGMENT_MAX_WORDS = 2;     // ≤2 words = short fragment

// Turkish conjunctions that shouldn't be standalone blocks
const TURKISH_CONJUNCTIONS = ['ve', 'ki', 'ise', 'dahi', 'hem', 'ya', 'veyahut', 'yahut', 'de', 'da'];

// ─────────────────────────────────────────────────────────────
// DETECTION FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Check if a character is Arabic
 */
function isArabicChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return ARABIC_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Check if a character is a harakah (diacritic)
 */
function isHarakah(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= HARAKAH_RANGE[0] && code <= HARAKAH_RANGE[1];
}

/**
 * Count Arabic characters in text
 */
export function countArabicChars(text: string): number {
    let count = 0;
    for (const char of text) {
        if (isArabicChar(char)) count++;
    }
    return count;
}

/**
 * Count harakah (diacritics) in text
 */
export function countHarakah(text: string): number {
    let count = 0;
    for (const char of text) {
        if (isHarakah(char)) count++;
    }
    return count;
}

/**
 * Calculate Arabic ratio (0-1)
 */
export function calculateArabicRatio(text: string): number {
    if (!text || text.length === 0) return 0;
    const arabicCount = countArabicChars(text);
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 ? arabicCount / totalChars : 0;
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check if text is primarily Arabic (should be rendered as arabic_block)
 */
export function isArabicBlock(text: string): boolean {
    if (!text) return false;

    const arabicCount = countArabicChars(text);
    const harakahCount = countHarakah(text);
    const wordCount = countWords(text);
    const arabicRatio = calculateArabicRatio(text);

    // Rule 1: High Arabic ratio (≥65%)
    if (arabicRatio >= ARABIC_RATIO_THRESHOLD) return true;

    // Rule 2: Sufficient Arabic chars (≥12)
    if (arabicCount >= ARABIC_BLOCK_MIN_CHARS) return true;

    // Rule 3: Multiple words with harakah
    if (wordCount >= ARABIC_BLOCK_MIN_WORDS && harakahCount > 0) return true;

    return false;
}

/**
 * Check if text is a short fragment (merge candidate)
 */
export function isShortFragment(text: string): boolean {
    if (!text) return true;
    const wordCount = countWords(text);
    return wordCount <= SHORT_FRAGMENT_MAX_WORDS;
}

/**
 * Check if text is a Turkish conjunction that shouldn't be standalone
 */
export function isOrphanConjunction(text: string): boolean {
    if (!text) return false;
    const normalized = text.trim().toLowerCase();
    return TURKISH_CONJUNCTIONS.includes(normalized);
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION
// ─────────────────────────────────────────────────────────────

/**
 * Classify a block based on its content
 */
export function classifyBlock(
    text: string,
    originalType: string = 'paragraph',
    originalLang?: string
): BlockClassification {
    // Handle explicit types first
    if (['heading', 'label', 'divider'].includes(originalType)) {
        return {
            type: originalType as BlockType,
            atomicity: 'atomic',
            lang: originalLang === 'ar' ? 'ar' : 'tr',
            isShortFragment: false,
            arabicRatio: 0,
        };
    }

    if (originalType === 'footnote') {
        return {
            type: 'footnote',
            atomicity: 'atomic',
            lang: 'tr',
            isShortFragment: false,
            arabicRatio: 0,
        };
    }

    // For paragraphs, analyze content
    const arabicRatio = calculateArabicRatio(text);
    const isArabic = isArabicBlock(text) || originalLang === 'ar';
    const shortFragment = isShortFragment(text);

    // Determine language
    let lang: Language = 'tr';
    if (arabicRatio >= ARABIC_RATIO_THRESHOLD) {
        lang = 'ar';
    } else if (arabicRatio > 0.1) {
        lang = 'mixed';
    }

    // Determine type and atomicity
    if (isArabic) {
        return {
            type: 'arabic_block',
            atomicity: 'atomic',  // Arabic blocks never split
            lang: 'ar',
            isShortFragment: shortFragment,
            arabicRatio,
        };
    }

    return {
        type: 'paragraph',
        atomicity: shortFragment ? 'atomic' : 'splittable',  // Short fragments stay together
        lang,
        isShortFragment: shortFragment,
        arabicRatio,
    };
}

/**
 * Parse a segment into a classified block
 */
export function parseBlock(segment: {
    id?: string;
    segmentId?: string;
    text: string;
    type?: string;
    lang?: string;
}): ParsedBlock {
    const id = segment.id || segment.segmentId || `block-${Date.now()}`;
    const text = segment.text || '';
    const originalType = segment.type || 'paragraph';
    const originalLang = segment.lang;

    return {
        id,
        text,
        originalType,
        originalLang,
        classification: classifyBlock(text, originalType, originalLang),
    };
}

// ─────────────────────────────────────────────────────────────
// BLOCK MERGING
// ─────────────────────────────────────────────────────────────

/**
 * Merge short fragments with their neighbors
 * Returns merged blocks array
 */
export function mergeShortFragments(blocks: ParsedBlock[]): ParsedBlock[] {
    if (blocks.length < 2) return blocks;

    const result: ParsedBlock[] = [];
    let i = 0;

    while (i < blocks.length) {
        const current = blocks[i];
        const next = blocks[i + 1];
        const prev = result[result.length - 1];

        // Check if current is orphan conjunction between blocks
        if (
            current.classification.isShortFragment &&
            isOrphanConjunction(current.text) &&
            prev && next
        ) {
            // Merge with previous block
            prev.text = `${prev.text} ${current.text}`;
            prev.classification = classifyBlock(prev.text, prev.originalType, prev.originalLang);
            i++;
            continue;
        }

        // Check if current short fragment should merge with next
        if (
            current.classification.isShortFragment &&
            current.classification.type === 'paragraph' &&
            next &&
            next.classification.type === 'paragraph'
        ) {
            // Merge current into next
            const merged: ParsedBlock = {
                id: current.id,
                text: `${current.text} ${next.text}`,
                originalType: current.originalType,
                originalLang: current.originalLang,
                classification: classifyBlock(`${current.text} ${next.text}`, current.originalType, current.originalLang),
            };
            result.push(merged);
            i += 2;  // Skip next since merged
            continue;
        }

        result.push(current);
        i++;
    }

    return result;
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export const blockDetector = {
    isArabicBlock,
    isShortFragment,
    isOrphanConjunction,
    classifyBlock,
    parseBlock,
    mergeShortFragments,
    countArabicChars,
    countHarakah,
    calculateArabicRatio,
    countWords,
};

export default blockDetector;
