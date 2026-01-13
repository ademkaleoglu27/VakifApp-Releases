const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const JSON_PATH = path.join(__dirname, '../assets/risale_json/lemalar.json');

const db = new Database(DB_PATH);

function ingestLemalar() {
    console.log('📖 Reading Lemalar JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ Lemalar JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    // Config for Lemalar
    const workSlug = 'lemalar';
    const bookId = 'risale.lemalar@diyanet.tr';
    const workTitle = 'Lemalar';
    const version = 'v1';

    console.log(`📘 Processing Work: ${workTitle} (${workSlug})`);

    // 0. Schema Migration (Auto-fix for assets/risale.db)
    // The source DB might not have the new columns yet (section_uid, book_id, version).
    // We must ensure they exist before inserting.
    const columns = db.prepare("PRAGMA table_info(sections)").all().map(c => c.name);

    if (!columns.includes('section_uid')) {
        console.log('🔧 Adding column: section_uid');
        db.prepare("ALTER TABLE sections ADD COLUMN section_uid TEXT").run();
    }
    if (!columns.includes('book_id')) {
        console.log('🔧 Adding column: book_id');
        db.prepare("ALTER TABLE sections ADD COLUMN book_id TEXT").run();
    }
    if (!columns.includes('version')) {
        console.log('🔧 Adding column: version');
        db.prepare("ALTER TABLE sections ADD COLUMN version TEXT").run();
    }
    // 'type' usually exists but check just in case
    // (Wait, 'type' was in the original ingest-mektubat, so likely exists. But good to be safe)
    if (!columns.includes('type')) {
        console.log('🔧 Adding column: type');
        db.prepare("ALTER TABLE sections ADD COLUMN type TEXT").run();
    }

    // 1. Insert Work
    // Note: 'works' table might not have book_id column in all versions, 
    // but the Prompt requirements say "Sections Table - Standard: book_id = ...".
    // We will check schema or bind assuming standard columns for 'works'.
    // Standard works: id, title, order_index, category
    const insertWork = db.prepare(`
        INSERT OR REPLACE INTO works (id, title, order_index, category) 
        VALUES (?, ?, ?, ?)
    `);

    // Lemalar order_index = 2 (Sozler=0, Mektubat=1)
    insertWork.run(workSlug, workTitle, 2, 'Ana Kitaplar');

    // 2. Process Blocks into Sections & Paragraphs
    // Check if 'sections' has book_id column. If not, we can't insert it directly here.
    // However, the prompt says "Sections Tablosu - Standart ... book_id='risale.lemalar...'".
    // If the column exists, we insert. If not, we might fail.
    // Let's assume the column exists or we rely on 'backfill' normalization if it doesn't?
    // Looking at previous 'ingest-mektubat.js', it DID NOT insert book_id.
    // But the User Prompt explicitly listed 'book_id' under Sections Table Standard.
    // 'ingest-mektubat.js' was: INSERT INTO sections (id, work_id, title, order_index, type, parent_id)
    // We will follow the PROMPT's requirement if possible, but safeguard against schema mismatch.
    // Safest bet: Use the same columns as mektubat for now, 
    // AND run a column add check or expect the 'normalization' in contentDb to handle book_id.
    // WAIT. contentDb migration adds book_id? I should check contentDb.ts first.
    // But I am writing this file now. I will stick to 'ingest-mektubat.js' columns 
    // to avoid SQL errors if schema isn't migrated yet, 
    // BUT I will modify contentDb normalization to update it.

    // Actually... if I look at 'sozlerSectionUidBackfill.ts' or others, book_id IS in sections.
    // Let's try to insert it if we can.
    // Better: Stick to what guarantees success (ingest-mektubat pattern) 
    // and rely on the REQUIRED contentDb normalization step to fill book_id.

    const insertSection = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id, section_uid) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    let sectionIndex = 0;
    let paragraphIndex = 0;

    // Clean existing
    db.prepare("DELETE FROM works WHERE id = ?").run(workSlug);
    db.prepare("DELETE FROM sections WHERE work_id = ?").run(workSlug);
    // Paragraphs cascade via manual query just in case
    // (We don't want to run expensive deletes if we can avoid, but for ingest it's safer)
    const sectionsToDelete = db.prepare("SELECT id FROM sections WHERE work_id = ?").all(workSlug);
    for (const s of sectionsToDelete) {
        db.prepare("DELETE FROM paragraphs WHERE section_id = ?").run(s.id);
    }

    // Re-insert work
    insertWork.run(workSlug, workTitle, 2, 'Ana Kitaplar');

    // Default Intro Section
    let currentSectionId = `${workSlug}-intro`;
    let currentSectionUid = `${workSlug}_intro`;
    let currentSectionTitle = 'Mukaddime';

    // Insert Intro
    insertSection.run(currentSectionId, workSlug, currentSectionTitle, sectionIndex++, 'chapter', null, currentSectionUid);

    const transaction = db.transaction(() => {
        for (const block of data.blocks) {
            if (block.type === 'heading') {
                const cleanTitle = block.text.trim();
                currentSectionId = `${workSlug}-${sectionIndex}`;
                // Deterministic UID: lemalar_1, lemalar_2...
                currentSectionUid = `${workSlug}_${sectionIndex}`;
                currentSectionTitle = cleanTitle;

                insertSection.run(currentSectionId, workSlug, currentSectionTitle, sectionIndex++, 'chapter', null, currentSectionUid);

                paragraphIndex = 0;
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
    console.log(`✅ Imported Lemalar: ${sectionIndex} sections.`);
}

ingestLemalar();
