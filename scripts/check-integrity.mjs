#!/usr/bin/env node
/**
 * check-integrity.mjs
 * Checks referential integrity of meta files (beyond schema validation).
 * Usage: node scripts/check-integrity.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let errors = [];
let warnings = [];

function loadJSON(filePath) {
    if (!existsSync(filePath)) return null;
    try {
        return JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function checkBook(bookPath, bookEntry) {
    const bookDir = join(ROOT, 'meta', bookPath);
    const book = loadJSON(join(bookDir, 'book.json'));
    const sections = loadJSON(join(bookDir, 'sections.json'));

    if (!book) {
        errors.push(`❌ book.json not found for: ${bookPath}`);
        return;
    }

    // Check bookId consistency
    if (book.bookId !== bookEntry.bookId) {
        errors.push(`❌ bookId mismatch: manifest says "${bookEntry.bookId}", book.json says "${book.bookId}"`);
    }

    // Check page count matches actual pages
    const pagesDir = join(bookDir, 'pages');
    if (existsSync(pagesDir)) {
        const pageFiles = readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        if (pageFiles.length !== book.pageCount) {
            errors.push(`❌ pageCount mismatch in ${bookEntry.bookId}: book.json says ${book.pageCount}, found ${pageFiles.length} files`);
        }

        // Collect all segmentIds for uniqueness check
        const allSegmentIds = new Set();
        const sectionIds = new Set(sections?.sections?.map(s => s.sectionId) || []);

        for (const pageFile of pageFiles) {
            const pagePath = join(pagesDir, pageFile);
            const page = loadJSON(pagePath);

            if (!page) {
                errors.push(`❌ Failed to load page: ${pagePath}`);
                continue;
            }

            // Check page.sectionId exists in sections
            if (sections && !sectionIds.has(page.sectionId)) {
                errors.push(`❌ Unknown sectionId "${page.sectionId}" in ${pageFile}`);
            }

            // Check page.bookId matches
            if (page.bookId !== book.bookId) {
                errors.push(`❌ bookId mismatch in ${pageFile}: expected "${book.bookId}", got "${page.bookId}"`);
            }

            // Check segmentId uniqueness
            for (const segment of page.segments || []) {
                if (allSegmentIds.has(segment.segmentId)) {
                    errors.push(`❌ Duplicate segmentId: "${segment.segmentId}" in ${bookEntry.bookId}`);
                }
                allSegmentIds.add(segment.segmentId);

                // Check anchor/ref integrity
                if (segment.ref?.anchorId) {
                    // For now, just note it - cross-page anchor checking would need more work
                    // This is a placeholder for future enhancement
                }
            }
        }

        console.log(`   ✅ ${allSegmentIds.size} unique segments in ${bookEntry.bookId}`);
    }

    // Check sections page coverage
    if (sections) {
        for (const section of sections.sections) {
            if (section.endPage < section.startPage) {
                errors.push(`❌ Invalid page range in section "${section.sectionId}": ${section.startPage}-${section.endPage}`);
            }
            if (section.endPage > book.pageCount) {
                errors.push(`❌ Section "${section.sectionId}" endPage (${section.endPage}) exceeds pageCount (${book.pageCount})`);
            }
        }
        console.log(`   ✅ ${sections.sections.length} sections validated in ${bookEntry.bookId}`);
    }
}

// Main integrity check
console.log('🔍 Checking meta integrity...\n');

// Load manifest
const manifestPath = join(ROOT, 'meta', 'manifest.json');
const manifest = loadJSON(manifestPath);

if (!manifest) {
    console.error('❌ Cannot load manifest.json. Run validate-meta.mjs first.');
    process.exit(1);
}

console.log(`📦 Corpus: ${manifest.corpusId} (schema v${manifest.schemaVersion})\n`);

// Check each book
for (const book of manifest.books) {
    console.log(`📖 Checking: ${book.title}`);
    checkBook(book.path, book);
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
    console.error(`\n❌ Integrity check failed with ${errors.length} error(s):\n`);
    errors.forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log('\n✅ All integrity checks passed!');
    process.exit(0);
}
