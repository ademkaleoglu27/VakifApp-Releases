/**
 * contentValidator.ts (V1.0 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * Automatic content validation for Risale books.
 * Scans blocks for suspicious patterns and generates reports.
 * 
 * Patterns detected:
 * - FRAGMENTED_PARAGRAPH: Short Turkish between Arabic blocks
 * - DUPLICATE_BLOCK: Same Arabic text repeated too often
 * - ORPHAN_CONJUNCTION: Turkish conjunctions alone
 * 
 * LOCKED: Validation logic. Adjust thresholds carefully.
 * ─────────────────────────────────────────────────────────────
 */

import { ParsedBlock, parseBlock, isOrphanConjunction } from './blockDetector';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type IssueType =
    | 'FRAGMENTED_PARAGRAPH'   // Short Turkish between Arabic blocks
    | 'DUPLICATE_BLOCK'        // Same Arabic repeated too often
    | 'ORPHAN_CONJUNCTION'     // Standalone conjunction
    | 'MISCLASSIFIED_ARABIC'   // Arabic marked as Turkish
    | 'SPLIT_SENTENCE';        // Sentence appears split

export type SuggestionType =
    | 'MERGE_WITH_NEIGHBOR'
    | 'RECLASSIFY_AS_ARABIC'
    | 'MANUAL_REVIEW'
    | 'NO_ACTION';

export interface ValidationIssue {
    issueType: IssueType;
    blockIds: string[];
    reason: string;
    suggestion: SuggestionType;
    context?: string;
}

export interface SectionValidation {
    bookId: string;
    sectionId: string;
    sectionTitle?: string;
    issues: ValidationIssue[];
    blockCount: number;
    arabicBlockCount: number;
}

export interface ValidationReport {
    generatedAt: string;
    bookId: string;
    totalSections: number;
    flaggedSections: number;
    issues: SectionValidation[];
}

// ─────────────────────────────────────────────────────────────
// THRESHOLDS
// ─────────────────────────────────────────────────────────────

const DUPLICATE_THRESHOLD = 3;  // Same text appearing >3 times
const SHORT_FRAGMENT_CONTEXT_WORDS = 2;  // Words to check around

// ─────────────────────────────────────────────────────────────
// VALIDATION FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Detect FRAGMENTED_PARAGRAPH pattern
 * Pattern: arabic_block + short_turkish + arabic_block
 */
function detectFragmentedParagraphs(blocks: ParsedBlock[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 1; i < blocks.length - 1; i++) {
        const prev = blocks[i - 1];
        const curr = blocks[i];
        const next = blocks[i + 1];

        // Check if current is short Turkish fragment between Arabic blocks
        if (
            prev.classification.type === 'arabic_block' &&
            curr.classification.type === 'paragraph' &&
            curr.classification.isShortFragment &&
            curr.classification.lang === 'tr' &&
            next.classification.type === 'arabic_block'
        ) {
            issues.push({
                issueType: 'FRAGMENTED_PARAGRAPH',
                blockIds: [prev.id, curr.id, next.id],
                reason: `Short Turkish "${curr.text.substring(0, 30)}..." appears between Arabic blocks`,
                suggestion: 'MERGE_WITH_NEIGHBOR',
                context: `[${prev.text.substring(0, 20)}...] → "${curr.text}" → [${next.text.substring(0, 20)}...]`,
            });
        }
    }

    return issues;
}

/**
 * Detect ORPHAN_CONJUNCTION pattern
 * Pattern: Standalone Turkish conjunction as separate block
 */
function detectOrphanConjunctions(blocks: ParsedBlock[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const block of blocks) {
        if (
            block.classification.type === 'paragraph' &&
            isOrphanConjunction(block.text)
        ) {
            issues.push({
                issueType: 'ORPHAN_CONJUNCTION',
                blockIds: [block.id],
                reason: `Conjunction "${block.text}" appears as standalone block`,
                suggestion: 'MERGE_WITH_NEIGHBOR',
            });
        }
    }

    return issues;
}

/**
 * Detect DUPLICATE_BLOCK pattern
 * Pattern: Same Arabic text appears too many times
 */
function detectDuplicateBlocks(blocks: ParsedBlock[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const textCounts = new Map<string, string[]>();

    // Count occurrences
    for (const block of blocks) {
        if (block.classification.type === 'arabic_block') {
            const normalized = block.text.trim();
            const ids = textCounts.get(normalized) || [];
            ids.push(block.id);
            textCounts.set(normalized, ids);
        }
    }

    // Flag duplicates
    for (const [text, ids] of textCounts.entries()) {
        if (ids.length > DUPLICATE_THRESHOLD) {
            issues.push({
                issueType: 'DUPLICATE_BLOCK',
                blockIds: ids,
                reason: `Arabic text "${text.substring(0, 40)}..." appears ${ids.length} times`,
                suggestion: 'MANUAL_REVIEW',
            });
        }
    }

    return issues;
}

/**
 * Detect MISCLASSIFIED_ARABIC pattern
 * Pattern: High Arabic ratio but marked as paragraph
 */
function detectMisclassifiedArabic(blocks: ParsedBlock[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const block of blocks) {
        if (
            block.originalLang !== 'ar' &&
            block.originalType === 'paragraph' &&
            block.classification.arabicRatio > 0.5 &&
            block.classification.type === 'arabic_block'
        ) {
            issues.push({
                issueType: 'MISCLASSIFIED_ARABIC',
                blockIds: [block.id],
                reason: `Block "${block.text.substring(0, 30)}..." has ${Math.round(block.classification.arabicRatio * 100)}% Arabic but marked as paragraph`,
                suggestion: 'RECLASSIFY_AS_ARABIC',
            });
        }
    }

    return issues;
}

// ─────────────────────────────────────────────────────────────
// MAIN VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate a section's blocks
 */
export function validateSection(
    bookId: string,
    sectionId: string,
    segments: Array<{ id?: string; segmentId?: string; text: string; type?: string; lang?: string }>,
    sectionTitle?: string
): SectionValidation {
    // Parse all segments into blocks
    const blocks = segments.map(parseBlock);

    // Run all detectors
    const issues: ValidationIssue[] = [
        ...detectFragmentedParagraphs(blocks),
        ...detectOrphanConjunctions(blocks),
        ...detectDuplicateBlocks(blocks),
        ...detectMisclassifiedArabic(blocks),
    ];

    // Count stats
    const arabicBlockCount = blocks.filter(b => b.classification.type === 'arabic_block').length;

    return {
        bookId,
        sectionId,
        sectionTitle,
        issues,
        blockCount: blocks.length,
        arabicBlockCount,
    };
}

/**
 * Validate multiple sections (for a book)
 */
export function validateBook(
    bookId: string,
    sections: Array<{
        sectionId: string;
        sectionTitle?: string;
        segments: Array<{ id?: string; segmentId?: string; text: string; type?: string; lang?: string }>;
    }>
): ValidationReport {
    const sectionValidations: SectionValidation[] = [];

    for (const section of sections) {
        const validation = validateSection(
            bookId,
            section.sectionId,
            section.segments,
            section.sectionTitle
        );

        // Only include sections with issues
        if (validation.issues.length > 0) {
            sectionValidations.push(validation);
        }
    }

    return {
        generatedAt: new Date().toISOString(),
        bookId,
        totalSections: sections.length,
        flaggedSections: sectionValidations.length,
        issues: sectionValidations,
    };
}

/**
 * Generate summary statistics
 */
export function getSummary(report: ValidationReport): {
    total: number;
    byType: Record<IssueType, number>;
} {
    const byType: Record<IssueType, number> = {
        'FRAGMENTED_PARAGRAPH': 0,
        'DUPLICATE_BLOCK': 0,
        'ORPHAN_CONJUNCTION': 0,
        'MISCLASSIFIED_ARABIC': 0,
        'SPLIT_SENTENCE': 0,
    };

    let total = 0;

    for (const section of report.issues) {
        for (const issue of section.issues) {
            byType[issue.issueType]++;
            total++;
        }
    }

    return { total, byType };
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export const contentValidator = {
    validateSection,
    validateBook,
    getSummary,
};

export default contentValidator;
