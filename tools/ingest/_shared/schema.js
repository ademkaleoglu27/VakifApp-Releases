function ensureSchema(db) {
    // 1. Ensure Columns in Sections Table
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
    if (!columns.includes('type')) {
        console.log('🔧 Adding column: type');
        db.prepare("ALTER TABLE sections ADD COLUMN type TEXT").run();
    }

    // 2. Prepare Standard Statements
    const insertWork = db.prepare(`
        INSERT OR REPLACE INTO works (id, title, order_index, category) 
        VALUES (?, ?, ?, ?)
    `);

    // Standard 9-arg insert (supports version)
    const insertSection = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id, section_uid, book_id, version) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Legacy 7-arg insert (no book_id, no version)
    const insertSectionOptionalBookId = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id, section_uid) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    return {
        insertWork,
        insertSection,
        insertSectionOptionalBookId,
        insertParagraph
    };
}

function clearWork(db, workSlug) {
    const sectionsToDelete = db.prepare("SELECT id FROM sections WHERE work_id = ?").all(workSlug);
    for (const s of sectionsToDelete) {
        db.prepare("DELETE FROM paragraphs WHERE section_id = ?").run(s.id);
    }
    db.prepare("DELETE FROM sections WHERE work_id = ?").run(workSlug);
    db.prepare("DELETE FROM works WHERE id = ?").run(workSlug);
}

module.exports = {
    ensureSchema,
    clearWork
};
