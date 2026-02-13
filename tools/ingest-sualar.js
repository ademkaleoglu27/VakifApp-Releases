const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const JSON_PATH = path.join(__dirname, '../assets/risale_json/sualar.json');

const db = new Database(DB_PATH);

function ingestSualar() {
    console.log('📖 Reading Şualar JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ Şualar JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    // Config for Şualar
    const workSlug = 'sualar';
    const bookId = 'risale.sualar@diyanet.tr';
    const workTitle = 'Şualar';
    const version = 'v1';

    console.log(`📘 Processing Work: ${workTitle} (${workSlug})`);

    // 0. Schema Migration
    const columns = db.prepare("PRAGMA table_info(sections)").all().map(c => c.name);

    if (!columns.includes('section_uid')) db.prepare("ALTER TABLE sections ADD COLUMN section_uid TEXT").run();
    if (!columns.includes('book_id')) db.prepare("ALTER TABLE sections ADD COLUMN book_id TEXT").run();
    if (!columns.includes('version')) db.prepare("ALTER TABLE sections ADD COLUMN version TEXT").run();
    if (!columns.includes('type')) db.prepare("ALTER TABLE sections ADD COLUMN type TEXT").run();

    // 1. Insert Work
    const insertWork = db.prepare(`
        INSERT OR REPLACE INTO works (id, title, order_index, category) 
        VALUES (?, ?, ?, ?)
    `);

    // Şualar order_index = 3
    insertWork.run(workSlug, workTitle, 3, 'Ana Kitaplar');

    // 2. Process Blocks into Sections & Paragraphs
    const insertSection = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id, section_uid, book_id, version) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    let sectionIndex = 0;
    let paragraphIndex = 0;

    // Clean existing
    console.log('Cleaning existing Şualar content...');
    db.prepare("DELETE FROM paragraphs WHERE section_id IN (SELECT id FROM sections WHERE work_id = ?)").run(workSlug);
    db.prepare("DELETE FROM sections WHERE work_id = ?").run(workSlug);

    const blocks = data.blocks || [];
    let currentSection = null;

    db.transaction(() => {
        for (const block of blocks) {
            // New Section
            if (block.type === 'section') {
                sectionIndex++;
                const sectionId = `${workSlug}_${sectionIndex}`;
                // UID is sanitized title or just ID
                const uid = sectionId;

                currentSection = sectionId;

                insertSection.run(
                    sectionId,
                    workSlug,
                    block.title || `Bölüm ${sectionIndex}`,
                    sectionIndex,
                    'CHAPTER',
                    null,
                    uid,
                    bookId,
                    version
                );
            }
            // Content Paragraph
            // Fixed: Check for p, h1-h6, quote, arabic
            else if (['p', 'paragraph', 'h1', 'h2', 'h3', 'h4', 'quote', 'arabic'].includes(block.type)) {
                if (!currentSection) continue;

                paragraphIndex++;
                const isArabic = block.type === 'arabic' ? 1 : 0;

                insertParagraph.run(
                    `${workSlug}_p_${paragraphIndex}`,
                    currentSection,
                    block.text, // Text content
                    paragraphIndex,
                    isArabic,
                    0 // page_no placeholder
                );
            }
        }
    })();

    console.log(`✅ Ingested ${sectionIndex} sections and ${paragraphIndex} paragraphs.`);
}

ingestSualar();
