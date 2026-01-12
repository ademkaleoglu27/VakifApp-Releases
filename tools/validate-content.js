#!/usr/bin/env node
/**
 * validate-content.js (V1.0)
 * ─────────────────────────────────────────────────────────────
 * CLI tool to validate Risale book content for segmentation issues.
 * 
 * Usage:
 *   node tools/validate-content.js --book sozler
 *   node tools/validate-content.js --book sozler --ci
 *   node tools/validate-content.js --all
 * 
 * Options:
 *   --book <id>    Validate specific book
 *   --all          Validate all books
 *   --ci           CI mode: exit 1 on critical issues, 0 on warnings only
 *   --json         Output as JSON
 *   --verbose      Show all issues, not just summary
 * ─────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const META_DIR = path.join(__dirname, '..', 'meta', 'books');
const CRITICAL_ISSUES = ['FRAGMENTED_PARAGRAPH', 'ORPHAN_CONJUNCTION'];

// ─────────────────────────────────────────────────────────────
// BLOCK DETECTOR (Inline - matches blockDetector.ts logic)
// ─────────────────────────────────────────────────────────────

const ARABIC_RANGES = [
    [0x0600, 0x06FF],
    [0x0750, 0x077F],
    [0x08A0, 0x08FF],
    [0xFB50, 0xFDFF],
    [0xFE70, 0xFEFF],
];

const HARAKAH_RANGE = [0x064B, 0x0652];
const ARABIC_BLOCK_MIN_CHARS = 12;
const ARABIC_RATIO_THRESHOLD = 0.65;
const TURKISH_CONJUNCTIONS = ['ve', 'ki', 'ise', 'dahi', 'hem', 'ya', 'veyahut', 'yahut', 'de', 'da'];

// Heading patterns (Turkish ordinals, section markers, etc.)
const HEADING_PATTERNS = [
    /^(Birinci|İkinci|Üçüncü|Dördüncü|Beşinci|Altıncı|Yedinci|Sekizinci|Dokuzuncu|Onuncu)/i,
    /^(On\s*(Birinci|İkinci|Üçüncü|Dördüncü|Beşinci|Altıncı|Yedinci|Sekizinci|Dokuzuncu))/i,
    /^(Yirminci|Otuzuncu|Kırkıncı|Ellinci)/i,
    /^(BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU)/,
    /\b(SÖZ|MEKTUP|LEM'A|ŞUA|MEVKIF|NOKTA|MİSAL|HATVE|MAKAM|NÜKTE|MESELE|ŞUBE)\b/i,
    /^(Mukaddime|Hâtime|Hatıra|Takdim|İfade|Başlangıç|İhtar|Tenbih)$/i,
    /:\s*$/,  // Ends with colon (label)
];

function isHeadingPattern(text) {
    if (!text) return false;
    const trimmed = text.trim();
    return HEADING_PATTERNS.some(pattern => pattern.test(trimmed));
}

function isArabicChar(char) {
    const code = char.charCodeAt(0);
    return ARABIC_RANGES.some(([start, end]) => code >= start && code <= end);
}

function countArabicChars(text) {
    let count = 0;
    for (const char of text) {
        if (isArabicChar(char)) count++;
    }
    return count;
}

function calculateArabicRatio(text) {
    if (!text || text.length === 0) return 0;
    const arabicCount = countArabicChars(text);
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 ? arabicCount / totalChars : 0;
}

function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function isArabicBlock(text) {
    if (!text) return false;
    const arabicCount = countArabicChars(text);
    const arabicRatio = calculateArabicRatio(text);
    if (arabicRatio >= ARABIC_RATIO_THRESHOLD) return true;
    if (arabicCount >= ARABIC_BLOCK_MIN_CHARS) return true;
    return false;
}

function isShortFragment(text) {
    return countWords(text) <= 2;
}

function isOrphanConjunction(text) {
    if (!text) return false;
    const normalized = text.trim().toLowerCase();
    return TURKISH_CONJUNCTIONS.includes(normalized);
}

function classifyBlock(text, originalType, originalLang) {
    const arabicRatio = calculateArabicRatio(text);
    const arabic = isArabicBlock(text) || originalLang === 'ar';
    const shortFrag = isShortFragment(text);
    const isHeading = isHeadingPattern(text);

    return {
        type: arabic ? 'arabic_block' : (isHeading ? 'heading' : 'paragraph'),
        isShortFragment: shortFrag && !isHeading,  // Headings are not fragments
        isHeading,
        arabicRatio,
        lang: arabicRatio >= ARABIC_RATIO_THRESHOLD ? 'ar' : 'tr',
    };
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

function validatePage(page) {
    const issues = [];
    const segments = page.segments || [];

    // Parse blocks
    const blocks = segments.map(s => ({
        id: s.segmentId,
        text: s.text,
        classification: classifyBlock(s.text, s.type, s.lang),
    }));

    // Detect FRAGMENTED_PARAGRAPH
    for (let i = 1; i < blocks.length - 1; i++) {
        const prev = blocks[i - 1];
        const curr = blocks[i];
        const next = blocks[i + 1];

        if (
            prev.classification.type === 'arabic_block' &&
            curr.classification.type === 'paragraph' &&
            curr.classification.isShortFragment &&
            next.classification.type === 'arabic_block'
        ) {
            issues.push({
                issueType: 'FRAGMENTED_PARAGRAPH',
                blockId: curr.id,
                text: curr.text,
                pageId: page.pageId,
            });
        }
    }

    // Detect ORPHAN_CONJUNCTION
    for (const block of blocks) {
        if (isOrphanConjunction(block.text)) {
            issues.push({
                issueType: 'ORPHAN_CONJUNCTION',
                blockId: block.id,
                text: block.text,
                pageId: page.pageId,
            });
        }
    }

    return issues;
}

function validateBook(bookId) {
    const bookDir = path.join(META_DIR, bookId, 'pages');

    if (!fs.existsSync(bookDir)) {
        console.error(`❌ Book directory not found: ${bookDir}`);
        return null;
    }

    const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.json')).sort();
    const allIssues = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(bookDir, file), 'utf8');
            const page = JSON.parse(content);
            const pageIssues = validatePage(page);
            allIssues.push(...pageIssues);
        } catch (err) {
            console.error(`⚠️ Error reading ${file}: ${err.message}`);
        }
    }

    return {
        bookId,
        totalPages: files.length,
        totalIssues: allIssues.length,
        criticalIssues: allIssues.filter(i => CRITICAL_ISSUES.includes(i.issueType)).length,
        issues: allIssues,
    };
}

// ─────────────────────────────────────────────────────────────
// CLI (V2.1 - CI hardening)
// ─────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const bookArg = args.find(a => a.startsWith('--book=')) || args[args.indexOf('--book') + 1];
    const isCI = args.includes('--ci');
    const isJSON = args.includes('--json');
    const isVerbose = args.includes('--verbose');
    const validateAll = args.includes('--all');
    const outArg = args.find(a => a.startsWith('--out='));
    const outFile = outArg ? outArg.split('=')[1] : 'FLAGGED_SECTIONS.json';

    const bookId = typeof bookArg === 'string' && !bookArg.startsWith('--') ? bookArg : null;

    if (!bookId && !validateAll) {
        console.log('Usage: node tools/validate-content.js --book <book_id> [--ci] [--json] [--verbose]');
        console.log('       node tools/validate-content.js --all [--ci] [--json] [--out=<file>]');
        process.exit(1);
    }

    console.log('🔍 Risale Content Validator (V2.1)');
    console.log('─'.repeat(50));

    const results = [];
    let totalPages = 0;

    if (validateAll) {
        const books = fs.readdirSync(META_DIR).filter(d =>
            fs.statSync(path.join(META_DIR, d)).isDirectory()
        );

        for (const book of books) {
            const result = validateBook(book);
            if (result) {
                results.push(result);
                totalPages += result.totalPages;
            }
        }
    } else {
        const result = validateBook(bookId);
        if (result) {
            results.push(result);
            totalPages += result.totalPages;
        }
    }

    // Calculate totals
    let totalCritical = 0;
    let totalWarnings = 0;
    let allIssues = [];

    for (const result of results) {
        totalCritical += result.criticalIssues;
        totalWarnings += result.totalIssues - result.criticalIssues;
        allIssues = allIssues.concat(result.issues.map(i => ({
            ...i,
            bookId: result.bookId
        })));

        if (!isJSON && !isCI) {
            console.log(`\n📖 ${result.bookId}`);
            console.log(`   Pages: ${result.totalPages}`);
            console.log(`   Issues: ${result.totalIssues} (${result.criticalIssues} critical)`);

            if (isVerbose && result.issues.length > 0) {
                console.log('\n   Issues:');
                for (const issue of result.issues) {
                    const icon = CRITICAL_ISSUES.includes(issue.issueType) ? '🔴' : '🟡';
                    console.log(`   ${icon} ${issue.issueType} @ ${issue.pageId}`);
                    console.log(`      Block: ${issue.blockId}`);
                    console.log(`      Text: "${issue.text.substring(0, 50)}..."`);
                }
            }
        }
    }

    // V2.1: Build FLAGGED_SECTIONS report
    const report = {
        generatedAt: new Date().toISOString(),
        schemaVersion: '2.1',
        summary: {
            scanned: totalPages,
            flagged: allIssues.length,
            critical: totalCritical,
            warnings: totalWarnings
        },
        sections: allIssues.map(i => ({
            bookId: i.bookId,
            pageId: i.pageId,
            blockId: i.blockId,
            issueType: i.issueType,
            text: i.text.substring(0, 100)
        }))
    };

    // V2.1: Always write FLAGGED_SECTIONS.json (even if empty)
    const outPath = path.join(__dirname, '..', outFile);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

    if (isJSON) {
        console.log(JSON.stringify(report, null, 2));
    } else {
        // V2.1: Concise summary line
        console.log('\n' + '─'.repeat(50));
        console.log(`📊 SCANNED: ${totalPages} | FLAGGED: ${allIssues.length} | CRITICAL: ${totalCritical}`);
        console.log(`📄 Artifact: ${outFile}`);
    }

    // CI exit code
    if (isCI) {
        if (totalCritical > 0) {
            console.log('\n❌ CI FAILED: Critical issues found');
            process.exit(1);
        } else {
            console.log('\n✅ CI PASSED');
            process.exit(0);
        }
    }

    console.log('\n✅ Validation complete');
    process.exit(0);
}

main();

