/**
 * blockDetector.ts (V2.1 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * TEK DOĞRULUK KAYNAĞI - Arabic block detection and text classification.
 * 
 * V2.1 Changes:
 * - Added Quran markers support (﴿ ﴾ ۝ ۞)
 * - Hash-based blockId scheme for collision prevention
 * - Pipeline enforcement: processPipeline() must be used for ingestion
 * 
 * Exports:
 * - normalizeText(raw: string): string
 * - detectBlockType(text: string): BlockType
 * - isArabicHeavy(text: string): boolean
 * - isShortTurkishGlue(text: string): boolean
 * - mergeGlueNeighbors(blocks: Block[]): Block[]
 * - processPipeline(segments, bookId, sectionId): Block[] -- MAIN ENTRY POINT
 * - generateBlockId(bookId, sectionId, ordinal, text): string
 * 
 * Eşikler:
 * - arabicCharCount >= 12 (tek kelimelik هو inline kalır)
 * - VEYA arabicWordCount >= 2
 * - VE arabicRatio >= 0.35
 * - VE (diacriticsRatio >= 0.08 VEYA hasQuranMarkers == true)
 * 
 * LOCKED: Core detection logic. Do not modify thresholds without testing.
 * ─────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type BlockType = 'paragraph' | 'arabic_block' | 'heading' | 'footnote' | 'label' | 'divider';

export interface Block {
    id: string;
    type: BlockType;
    text: string;
    lang?: 'tr' | 'ar' | 'mixed';
    isGlue?: boolean;  // True if this is a short glue fragment
}

export interface RawSegment {
    id?: string;
    segmentId?: string;
    text: string;
    type?: string;
    lang?: string;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS & THRESHOLDS (STABİL DEFAULT'LAR)
// ─────────────────────────────────────────────────────────────

// Arabic Unicode ranges
const ARABIC_RANGES = [
    [0x0600, 0x06FF],  // Arabic
    [0x0750, 0x077F],  // Arabic Supplement
    [0x08A0, 0x08FF],  // Arabic Extended-A
    [0xFB50, 0xFDFF],  // Arabic Presentation Forms-A
    [0xFE70, 0xFEFF],  // Arabic Presentation Forms-B
];

// Harakah (diacritics) range
const HARAKAH_RANGE = [0x064B, 0x0652];

// Quran markers (V2.1) - these bypass diacritics requirement
// ﴿ (FD3E) ﴾ (FD3F) ۝ (06DD) ۞ (06DE)
const QURAN_MARKERS = ['\uFD3E', '\uFD3F', '\u06DD', '\u06DE'];

// Thresholds (stable defaults per user prompt)
const ARABIC_CHAR_MIN = 12;             // Minimum Arabic chars for block classification
const ARABIC_WORD_MIN = 2;              // Minimum Arabic words
const DIACRITICS_RATIO_MIN = 0.08;      // Minimum harakah ratio
const ARABIC_RATIO_MIN = 0.35;          // Minimum Arabic char ratio

// Turkish glue words (tek başına blok olamaz)
const TURKISH_GLUE_WORDS = [
    've', 'veya', 'ya', 'ile', 'ise', 'ki', 'dahi', 'hem',
    'fakat', 'lakin', 'ancak', 'şu', 'bu', 'o', 'de', 'da'
];

// ─────────────────────────────────────────────────────────────
// HASH FUNCTION (V2.1 - for blockId collision prevention)
// ─────────────────────────────────────────────────────────────

/**
 * Simple hash function for text (djb2 algorithm)
 * Returns 8-char hex string
 */
function hashText(text: string): string {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash) + text.charCodeAt(i);
        hash = hash & hash;  // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

/**
 * Generate collision-resistant blockId
 * Format: ${bookId}:${sectionId}:${ordinal}:${hash(normalizedText).slice(0,8)}
 */
export function generateBlockId(
    bookId: string,
    sectionId: string,
    ordinal: number,
    normalizedText: string
): string {
    const textHash = hashText(normalizedText);
    return `${bookId}:${sectionId}:${ordinal}:${textHash}`;
}

// ─────────────────────────────────────────────────────────────
// TEXT NORMALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Normalize text for consistent processing
 * Rules per user prompt:
 * - \r\n -> \n
 * - Multiple spaces -> single space
 * - Trim line start/end
 * - Remove zero-width chars (except in Arabic)
 * - Remove soft hyphen \u00AD
 */
export function normalizeText(raw: string): string {
    if (!raw) return '';

    let text = raw;

    // 1. \r\n -> \n
    text = text.replace(/\r\n/g, '\n');

    // 2. Remove soft hyphen
    text = text.replace(/\u00AD/g, '');

    // 3. Remove zero-width chars (ZWNJ/ZWJ) - but keep them if surrounded by Arabic
    // For safety, only remove if not between Arabic chars
    text = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, (match, offset, str) => {
        // Keep if surrounded by Arabic
        const prevChar = str[offset - 1] || '';
        const nextChar = str[offset + 1] || '';
        if (isArabicChar(prevChar) && isArabicChar(nextChar)) {
            return match;
        }
        return '';
    });

    // 4. Multiple spaces -> single space
    text = text.replace(/[ \t]+/g, ' ');

    // 5. Trim
    text = text.trim();

    return text;
}

// ─────────────────────────────────────────────────────────────
// DETECTION HELPERS
// ─────────────────────────────────────────────────────────────

function isArabicChar(char: string): boolean {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return ARABIC_RANGES.some(([start, end]) => code >= start && code <= end);
}

function isHarakah(char: string): boolean {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return code >= HARAKAH_RANGE[0] && code <= HARAKAH_RANGE[1];
}

/**
 * Check if text contains Quran markers (V2.1)
 * Markers: ﴿ ﴾ ۝ ۞
 */
function hasQuranMarkers(text: string): boolean {
    return QURAN_MARKERS.some(marker => text.includes(marker));
}

function countArabicChars(text: string): number {
    let count = 0;
    for (const char of text) {
        if (isArabicChar(char)) count++;
    }
    return count;
}

function countHarakah(text: string): number {
    let count = 0;
    for (const char of text) {
        if (isHarakah(char)) count++;
    }
    return count;
}

function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function countArabicWords(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    let count = 0;
    for (const word of words) {
        const arabicCount = countArabicChars(word);
        if (arabicCount > word.length * 0.5) count++;  // Word is majority Arabic
    }
    return count;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Check if text is primarily Arabic (should be rendered as arabic_block)
 * V2.1 Enhanced thresholds:
 * - arabicCharCount >= 12 OR arabicWordCount >= 2
 * - AND arabicRatio >= 0.35
 * - AND (diacriticsRatio >= 0.08 OR hasQuranMarkers == true)
 */
export function isArabicHeavy(text: string): boolean {
    if (!text) return false;

    const arabicCount = countArabicChars(text);
    const harakahCount = countHarakah(text);
    const arabicWords = countArabicWords(text);
    const totalLetters = text.replace(/\s/g, '').length;

    if (totalLetters === 0) return false;

    const arabicRatio = arabicCount / totalLetters;
    const diacriticsRatio = harakahCount / totalLetters;

    // Must meet arabic ratio minimum
    if (arabicRatio < ARABIC_RATIO_MIN) return false;

    // Must meet diacritics ratio OR have Quran markers (V2.1 enhancement)
    if (diacriticsRatio < DIACRITICS_RATIO_MIN && !hasQuranMarkers(text)) return false;

    // Must meet char count OR word count
    if (arabicCount >= ARABIC_CHAR_MIN) return true;
    if (arabicWords >= ARABIC_WORD_MIN) return true;

    return false;
}

/**
 * Check if text is a short Turkish glue phrase (should merge with neighbor)
 * Per user prompt: word count <= 2 AND only glue words
 */
export function isShortTurkishGlue(text: string): boolean {
    if (!text) return false;

    const normalized = normalizeText(text).toLowerCase();
    const words = normalized.split(/\s+/).filter(w => w.length > 0);

    // Must be 2 words or less
    if (words.length > 2) return false;
    if (words.length === 0) return false;

    // All words must be glue words
    return words.every(word => TURKISH_GLUE_WORDS.includes(word));
}

/**
 * Detect block type from text content
 * Order of detection:
 * 1. If JSON type provided, use that
 * 2. Check if Arabic heavy -> arabic_block
 * 3. Default -> paragraph
 */
export function detectBlockType(text: string, existingType?: string): BlockType {
    // If explicit type provided, validate and use it
    if (existingType) {
        const validTypes: BlockType[] = ['paragraph', 'arabic_block', 'heading', 'footnote', 'label', 'divider'];
        if (validTypes.includes(existingType as BlockType)) {
            return existingType as BlockType;
        }
    }

    // Detect Arabic blocks
    if (isArabicHeavy(text)) {
        return 'arabic_block';
    }

    // Default to paragraph
    return 'paragraph';
}

/**
 * Merge glue fragments with their neighbors
 * Per user prompt: "ve/ise/ki" gibi tek kelimelik blokları komşu paragraph'a birleştirir
 */
export function mergeGlueNeighbors(blocks: Block[]): Block[] {
    if (blocks.length < 2) return blocks;

    const result: Block[] = [];
    let i = 0;

    while (i < blocks.length) {
        const current = blocks[i];

        // Check if current is a glue fragment
        if (current.isGlue || isShortTurkishGlue(current.text)) {
            const next = blocks[i + 1];

            // If next is Turkish paragraph, merge current into it
            if (next && next.type === 'paragraph' && next.lang !== 'ar') {
                const merged: Block = {
                    ...next,
                    text: `${current.text} ${next.text}`,
                };
                result.push(merged);
                i += 2;  // Skip both current and next
                continue;
            }

            // If previous is Turkish paragraph, merge current into it
            const prev = result[result.length - 1];
            if (prev && prev.type === 'paragraph' && prev.lang !== 'ar') {
                prev.text = `${prev.text} ${current.text}`;
                i++;
                continue;
            }
        }

        result.push(current);
        i++;
    }

    return result;
}

/**
 * Parse raw segments into classified blocks (internal use)
 */
function parseSegmentsInternal(
    segments: RawSegment[],
    bookId: string,
    sectionId: string
): Block[] {
    return segments.map((seg, idx) => {
        const text = normalizeText(seg.text || '');
        const type = detectBlockType(text, seg.type);
        const lang = seg.lang as 'tr' | 'ar' | 'mixed' | undefined;
        const isGlue = isShortTurkishGlue(text);

        // Generate hash-based ID if no existing ID (V2.1)
        const id = seg.id || seg.segmentId || generateBlockId(bookId, sectionId, idx, text);

        return { id, type, text, lang, isGlue };
    });
}

/**
 * MAIN ENTRY POINT (V2.1)
 * Full pipeline: raw -> normalizeText -> detectBlockType -> mergeGlueNeighbors
 * 
 * IMPORTANT: All ingestion must go through this function.
 * No code path may bypass normalizeText/mergeGlueNeighbors.
 */
export function processPipeline(
    segments: RawSegment[],
    bookId: string,
    sectionId: string
): Block[] {
    // Step 1: Parse and normalize all segments
    const parsed = parseSegmentsInternal(segments, bookId, sectionId);

    // Step 2: Merge glue neighbors
    const merged = mergeGlueNeighbors(parsed);

    return merged;
}

/**
 * Legacy function - wraps processPipeline with default IDs
 * @deprecated Use processPipeline instead
 */
export function parseSegments(segments: RawSegment[]): Block[] {
    return processPipeline(segments, 'unknown', 'unknown');
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export const blockDetector = {
    normalizeText,
    detectBlockType,
    isArabicHeavy,
    isShortTurkishGlue,
    mergeGlueNeighbors,
    parseSegments,
    processPipeline,
    generateBlockId,
};

export default blockDetector;
