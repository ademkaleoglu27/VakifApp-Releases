const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// --- ⚙️ CONFIGURATION (UPDATE THESE) ---
const WORK_SLUG = 'new_book';               // e.g. 'sualar'
const WORK_TITLE = 'New Book';              // e.g. 'Şualar'
const BOOK_ID = `risale.${WORK_SLUG}@diyanet.tr`;
const VERSION = 'v1';
const ORDER_INDEX = 99;                     // Sozler=0, Mektubat=1, Lemalar=2...
const JSON_FILENAME = `${WORK_SLUG}.json`;  // Ensure this file exists in assets/risale_json/

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const JSON_PATH = path.join(__dirname, `../assets/risale_json/${JSON_FILENAME}`);
const META_PATH = path.join(__dirname, '../assets/content/content.meta.json');
// ----------------------------------------

const db = new Database(DB_PATH);

function ingestBook() {
    console.log(`📖 Reading ${WORK_TITLE} JSON...`);
    if (!fs.existsSync(JSON_PATH)) {
        console.error(`❌ JSON not found at: ${JSON_PATH}`);
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    console.log(`📘 Processing Work: ${WORK_TITLE} (${WORK_SLUG})`);

    // 0. Schema Migration (Auto-fix for assets/risale.db)
    const columns = db.prepare("PRAGMA table_info(sections)").all().map(c => c.name);

    ['section_uid', 'book_id', 'version', 'type'].forEach(col => {
        if (!columns.includes(col)) {
            console.log(`🔧 Adding missing column: ${col}`);
            db.prepare(`ALTER TABLE sections ADD COLUMN ${col} TEXT`).run();
        }
    });

    // 1. Prepare Statements
    const insertWork = db.prepare(`
        INSERT OR REPLACE INTO works (id, title, order_index, category) 
        VALUES (?, ?, ?, ?)
    `);

    const insertSection = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id, section_uid, book_id, version) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // 2. Clear Existing Data
    console.log('🧹 Clearing existing data...');
    db.prepare("DELETE FROM works WHERE id = ?").run(WORK_SLUG);

    // Cascading delete for sections and paragraphs 
    // (Manual approach to ensure cleanliness in this specific scope)
    const sectionsToDelete = db.prepare("SELECT id FROM sections WHERE work_id = ?").all(WORK_SLUG);
    const deleteParagraphsStmt = db.prepare("DELETE FROM paragraphs WHERE section_id = ?");
    for (const s of sectionsToDelete) {
        deleteParagraphsStmt.run(s.id);
    }
    db.prepare("DELETE FROM sections WHERE work_id = ?").run(WORK_SLUG);

    // Explicit cleanup for any potential orphans with this slug prefix
    db.prepare(`DELETE FROM paragraphs WHERE section_id LIKE '${WORK_SLUG}-%'`).run();
    db.prepare(`DELETE FROM paragraphs WHERE section_id LIKE '${WORK_SLUG}_%'`).run();

    // 3. Process & Insert
    console.log('📝 Inserting new data...');
    insertWork.run(WORK_SLUG, WORK_TITLE, ORDER_INDEX, 'Ana Kitaplar');

    let sectionIndex = 0;
    let paragraphIndex = 0;

    // Intro Section (Optional, adjust as needed)
    let currentSectionId = `${WORK_SLUG}-intro`;
    let currentSectionUid = `${WORK_SLUG}_intro`;
    let currentSectionTitle = 'Mukaddime';
    let currentType = 'main';

    // Insert Initial Section (Intro)
    insertSection.run(currentSectionId, WORK_SLUG, currentSectionTitle, sectionIndex++, currentType, null, currentSectionUid, BOOK_ID, VERSION);

    const transaction = db.transaction(() => {
        for (const block of data.blocks) {
            if (block.type === 'heading') {
                const cleanTitle = block.text.trim();
                currentSectionId = `${WORK_SLUG}-${sectionIndex}`;
                currentSectionUid = `${WORK_SLUG}_${sectionIndex}`; // Underscore for UID
                currentSectionTitle = cleanTitle;
                paragraphIndex = 0;

                insertSection.run(
                    currentSectionId,
                    WORK_SLUG,
                    currentSectionTitle,
                    sectionIndex++,
                    'chapter',
                    null,
                    currentSectionUid,
                    BOOK_ID,
                    VERSION
                );
                continue;
            }

            const pId = `${currentSectionId}-${paragraphIndex}`;
            const isArabic = block.type === 'arabic_block' ? 1 : 0;

            insertParagraph.run(
                pId,
                currentSectionId,
                block.text,
                paragraphIndex++,
                isArabic,
                0
            );
        }
    });

    transaction();
    console.log(`✅ Imported ${sectionIndex} sections.`);

    // 4. Verification
    const secCount = db.prepare("SELECT COUNT(*) as c FROM sections WHERE work_id = ?").get(WORK_SLUG);
    const paraCount = db.prepare("SELECT COUNT(*) as c FROM paragraphs WHERE section_id LIKE ?").get(`${WORK_SLUG}%`);
    console.log(`📊 Verification: ${secCount.c} sections, ${paraCount.c} paragraphs.`);

    // 5. Meta Bump
    if (fs.existsSync(META_PATH)) {
        const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
        meta.version += 1;
        meta.lastUpdated = new Date().toISOString();
        fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
        console.log(`🆙 Bumped DB Version to: ${meta.version}`);
    } else {
        console.warn('⚠️ content.meta.json not found, version not bumped.');
    }

    db.close();
}

ingestBook();
