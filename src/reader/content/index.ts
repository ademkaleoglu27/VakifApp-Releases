/**
 * src/reader/content/index.ts
 * ─────────────────────────────────────────────────────────────
 * Central export for content processing modules.
 * ─────────────────────────────────────────────────────────────
 */

export {
    normalizeText,
    detectBlockType,
    isArabicHeavy,
    isShortTurkishGlue,
    mergeGlueNeighbors,
    parseSegments,
    blockDetector,
    type Block,
    type BlockType,
} from './blockDetector';
