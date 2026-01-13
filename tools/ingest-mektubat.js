const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const JSON_PATH = path.join(__dirname, '../assets/risale_json/mektubat.json');

const db = new Database(DB_PATH);

function ingestMektubat() {
    console.log('📖 Reading Mektubat JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ Mektubat JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    const workSlug = data.meta.slug || 'mektubat';
    const workTitle = data.meta.title || 'Mektubat';

    console.log(`📘 Processing Work: ${workTitle} (${workSlug})`);

    // 1. Insert Work
    const insertWork = db.prepare(`
        INSERT OR IGNORE INTO works (id, title, order_index, category) 
        VALUES (?, ?, ?, ?)
    `);

    // Check if work exists first to determine update or ignore
    // But INSERT OR IGNORE is fine. Order index: Sozler is 0, give Mektubat 1.
    insertWork.run(workSlug, workTitle, 1, 'Ana Kitaplar');

    // 2. Process Blocks into Sections & Paragraphs
    const insertSection = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    let sectionIndex = 0;
    let paragraphIndex = 0;

    // Create a default initial section if the first block isn't a heading
    let currentSectionId = `${workSlug}-intro`;
    let currentSectionTitle = 'Mukaddime';

    // If first block is heading, we'll start iteration differently.
    // Usually Mektubat starts with Besmele (Arabic) then "Birinci Mektup" (Heading).
    // We can group introductory blocks into an "Intro" section.

    // We need to verify if 'mektubat' work already has sections to avoid duplicates if re-run?
    // User said "current DB only has Sozler". We assume clean slate for Mektubat.
    // However, to be safe, we can DELETE existing mektubat entries.

    db.prepare("DELETE FROM works WHERE id = ?").run(workSlug);
    db.prepare("DELETE FROM sections WHERE work_id = ?").run(workSlug);
    // Paragraphs cascade? SQLite typically handles via FK or we delete manually.
    // Let's delete manually to be safe if FKs aren't cascading.
    // Actually, sections delete might not cascade paragraphs in this simple schema if not defined.
    // But since we are ingesting from scratch into a presumably clean state for this book...
    // Let's rely on standard logic.

    // Re-insert work
    insertWork.run(workSlug, workTitle, 1, 'Ana Kitaplar');

    // Start with an implicit section
    insertSection.run(currentSectionId, workSlug, currentSectionTitle, sectionIndex++, 'chapter', null);

    const transaction = db.transaction(() => {
        for (const block of data.blocks) {

            if (block.type === 'heading') {
                // Start New Section
                const cleanTitle = block.text.trim();
                currentSectionId = `${workSlug}-${sectionIndex}`;
                currentSectionTitle = cleanTitle;

                insertSection.run(currentSectionId, workSlug, currentSectionTitle, sectionIndex++, 'chapter', null);

                // Reset paragraph index for new section? 
                // Usually paragraph IDs are global or section-relative. 
                // The schema in build-content-db used global counter kind of, or per page.
                // Note: build-content-db used `p-${paragraphCounter}` globally.
                // We should ensure uniqueness. Let's use `${currentSectionId}-${pIdx}`.
                paragraphIndex = 0;

                // Do NOT insert the heading itself as a paragraph?
                // The viewer usually displays the Section Title.
                // If we insert it as a paragraph, it appears twice.
                // Convention: If type is heading, it becomes Section Title. We skip inserting as paragraph.
                continue;
            }

            // Insert Paragraph
            const pId = `${currentSectionId}-${paragraphIndex}`;
            const isArabic = block.type === 'arabic_block' ? 1 : 0;
            const metaJson = JSON.stringify(block);

            insertParagraph.run(
                pId,
                currentSectionId,
                block.text,
                paragraphIndex++,
                isArabic,
                0 // page_no
            );
        }
    });

    transaction();
    console.log(`✅ Imported Mektubat: ${sectionIndex} sections.`);
}

ingestMektubat();
