const fs = require('fs');
const path = require('path');

const META_DIR = path.join(__dirname, '..', 'meta', 'books');
const SCHEMA_DIR = path.join(__dirname, '..', 'schema');

// Diamond Standard Allowed Types
const ALLOWED_SEGMENT_TYPES = [
    'heading', 'subheading', 'paragraph', 'arabicBlock',
    'quote', 'listItem', 'divider', 'footnote', 'hashiye', 'label', 'note', 'poetry'
];

function validate() {
    console.log('🛡️  Starting Diamond Standard Schema Validation...');

    if (!fs.existsSync(META_DIR)) {
        console.error('❌ Meta directory not found!');
        process.exit(1);
    }

    const books = fs.readdirSync(META_DIR).filter(f => fs.statSync(path.join(META_DIR, f)).isDirectory());
    let errorCount = 0;

    books.forEach(bookDirName => {
        const bookPath = path.join(META_DIR, bookDirName);
        console.log(`\n📘 Checking Book: ${bookDirName}`);

        // 1. Check book.json
        const bookJsonPath = path.join(bookPath, 'book.json');
        if (!fs.existsSync(bookJsonPath)) {
            console.error(`   ❌ Missing book.json`);
            errorCount++;
        } else {
            try {
                const meta = JSON.parse(fs.readFileSync(bookJsonPath));
                if (!meta.bookId || !meta.title) {
                    console.error(`   ❌ book.json missing required fields (bookId, title)`);
                    errorCount++;
                } else {
                    console.log(`   ✅ book.json (ID: ${meta.bookId})`);
                }
            } catch (e) {
                console.error(`   ❌ Invalid book.json syntax`);
                errorCount++;
            }
        }

        // 2. Check sections.json
        const sectionsPath = path.join(bookPath, 'sections.json');
        if (!fs.existsSync(sectionsPath)) {
            console.error(`   ❌ Missing sections.json`);
            errorCount++;
        } else {
            try {
                const secData = JSON.parse(fs.readFileSync(sectionsPath));
                if (!secData.sections || !Array.isArray(secData.sections)) {
                    console.error(`   ❌ sections.json missing 'sections' array`);
                    errorCount++;
                } else {
                    console.log(`   ✅ sections.json (${secData.sections.length} sections)`);
                }
            } catch (e) {
                console.error(`   ❌ Invalid sections.json syntax`);
                errorCount++;
            }
        }

        // 3. Check Pages
        const pagesDir = path.join(bookPath, 'pages');
        if (!fs.existsSync(pagesDir)) {
            console.error(`   ❌ Missing pages directory`);
            errorCount++;
        } else {
            const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
            console.log(`   🔍 Checking ${pageFiles.length} pages...`);

            let pageErrors = 0;
            pageFiles.forEach(pFile => {
                const pPath = path.join(pagesDir, pFile);
                try {
                    const pData = JSON.parse(fs.readFileSync(pPath));

                    if (!pData.segments || !Array.isArray(pData.segments)) {
                        console.error(`      ❌ ${pFile}: Missing segments array`);
                        pageErrors++;
                        return;
                    }

                    pData.segments.forEach((seg, idx) => {
                        if (!ALLOWED_SEGMENT_TYPES.includes(seg.type)) {
                            console.error(`      ❌ ${pFile} [Seg ${idx}]: Invalid type '${seg.type}'`);
                            pageErrors++;
                        }
                        // Diamond Standard Checks
                        if (seg.type === 'paragraph' && !seg.text) {
                            console.error(`      ❌ ${pFile} [Seg ${idx}]: Paragraph missing text`);
                            pageErrors++;
                        }
                        // Poetry Validation
                        if (seg.type === 'poetry') {
                            if (!seg.lines || !Array.isArray(seg.lines) || seg.lines.length === 0) {
                                console.error(`      ❌ ${pFile} [Seg ${idx}]: Poetry missing 'lines' array`);
                                pageErrors++;
                            } else {
                                seg.lines.forEach((line, lIdx) => {
                                    if (!line.text) {
                                        console.error(`      ❌ ${pFile} [Seg ${idx} L${lIdx}]: Poetry line missing 'text'`);
                                        pageErrors++;
                                    }
                                });
                            }
                        }
                    });

                } catch (e) {
                    console.error(`      ❌ ${pFile}: Invalid JSON`);
                    pageErrors++;
                }
            });

            if (pageErrors === 0) {
                console.log(`   ✅ All pages passed Diamond Standard check.`);
            } else {
                errorCount += pageErrors;
            }
        }
    });

    console.log('\n────────────────────────────────────────');
    if (errorCount === 0) {
        console.log('✅ VALIDATION SUCCESS: All books conform to Diamond Standard Schema.');
        process.exit(0);
    } else {
        console.error(`❌ VALIDATION FAILED: Found ${errorCount} errors.`);
        process.exit(1);
    }
}

validate();
