const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// --- ⚙️ CONFIGURATION ---
const WORK_SLUG = 'barla_lahikasi';         // work_id
const WORK_TITLE = 'Barla Lâhikası';
const BOOK_ID = 'risale.barla_lahikasi@diyanet.tr';
const VERSION = 'v1';
const ORDER_INDEX = 9;                      // After Sikke-i Tasdik-i Gaybî
const JSON_FILENAME = 'barla-lahikasi.json'; // Verified filename
// ------------------------

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const JSON_PATH = path.join(__dirname, `../assets/risale_json/${JSON_FILENAME}`);
const META_PATH = path.join(__dirname, '../assets/content/content.meta.json');

const db = new Database(DB_PATH);

function ingestBook() {
    console.log(`📖 Reading ${WORK_TITLE} JSON...`);
    if (!fs.existsSync(JSON_PATH)) {
        console.error(`❌ JSON not found at: ${JSON_PATH}`);
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    console.log(`📘 Processing Work: ${WORK_TITLE} (${WORK_SLUG})`);

    // 0. Schema Migration
    const columns = db.prepare("PRAGMA table_info(sections)").all().map(c => c.name);

    ['section_uid', 'book_id', 'version', 'type'].forEach(col => {
        if (!columns.includes(col)) {
            console.log(`🔧 Adding missing column: ${col}`);
            try {
                db.prepare(`ALTER TABLE sections ADD COLUMN ${col} TEXT`).run();
            } catch (e) {
                console.log(`⚠️ Could not add column ${col} (might exist): ${e.message}`);
            }
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

    // 2. Clear Existing Data for THIS WORK ONLY
    console.log('🧹 Clearing existing data for target work...');
    db.prepare("DELETE FROM works WHERE id = ?").run(WORK_SLUG);

    const sectionsToDelete = db.prepare("SELECT id FROM sections WHERE work_id = ?").all(WORK_SLUG);
    const deleteParagraphsStmt = db.prepare("DELETE FROM paragraphs WHERE section_id = ?");
    for (const s of sectionsToDelete) {
        deleteParagraphsStmt.run(s.id);
    }
    db.prepare("DELETE FROM sections WHERE work_id = ?").run(WORK_SLUG);

    // Safety cleanup for orphans
    db.prepare(`DELETE FROM paragraphs WHERE section_id LIKE '${WORK_SLUG}-%'`).run();
    db.prepare(`DELETE FROM paragraphs WHERE section_id LIKE '${WORK_SLUG}_%'`).run();

    // 3. Process & Insert
    console.log('📝 Inserting new data...');
    insertWork.run(WORK_SLUG, WORK_TITLE, ORDER_INDEX, 'Ana Kitaplar');

    let sectionIndex = 0;
    let paragraphIndex = 0;

    // Intro Section
    let currentSectionId = `${WORK_SLUG}-intro`;
    let currentSectionUid = `${WORK_SLUG}_intro`;
    let currentSectionTitle = 'Mukaddime';
    let currentType = 'main';

    insertSection.run(currentSectionId, WORK_SLUG, currentSectionTitle, sectionIndex++, currentType, null, currentSectionUid, BOOK_ID, VERSION);

    const transaction = db.transaction(() => {
        for (const block of data.blocks) {
            if (block.type === 'heading') {
                const cleanTitle = block.text.trim();
                currentSectionId = `${WORK_SLUG}-${sectionIndex}`;
                currentSectionUid = `${WORK_SLUG}_${sectionIndex}`;
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

    // 4. Verification & Regression Guard
    const secCount = db.prepare("SELECT COUNT(*) as c FROM sections WHERE work_id = ?").get(WORK_SLUG);
    const paraCount = db.prepare("SELECT COUNT(*) as c FROM paragraphs WHERE section_id LIKE ?").get(`${WORK_SLUG}%`);
    const bookIdCheck = db.prepare("SELECT DISTINCT book_id FROM sections WHERE work_id = ?").all(WORK_SLUG);

    console.log(`📊 ${WORK_TITLE} Stats: ${secCount.c} sections, ${paraCount.c} paragraphs.`);
    console.log(`🆔 Book IDs found: ${bookIdCheck.map(r => r.book_id).join(', ')}`);

    const regressionCheck = db.prepare(`
        SELECT work_id, COUNT(*) as c 
        FROM sections 
        WHERE work_id IN ('sozler','mektubat','lemalar','sualar','asayi_musa','isaratul_icaz','mesnevi_nuriye','sikke_i_tasdik_i_gaybi') 
        GROUP BY work_id
    `).all();

    console.log('🛡️ Regression Guard (Existing Books):');
    regressionCheck.forEach(row => {
        console.log(`   - ${row.work_id}: ${row.c} sections`);
    });

    if (secCount.c === 0 || paraCount.c === 0) {
        console.error('❌ FAILURE: Ingestion resulted in 0 records!');
        process.exit(1);
    }

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
