const { getDb, closeDb } = require('../_shared/db');
const { ensureSchema, clearWork } = require('../_shared/schema');
const { ingestContent } = require('../_shared/content');
const fs = require('fs');
const path = require('path');

// Adjusted path to match original script's relative location assumption
// Original was in tools/, shared is tools/ingest/_shared/.
// So ../assets is correct for tools/.
const JSON_PATH = path.join(__dirname, '../../../assets/risale_json/mektubat.json');

function ingestMektubat() {
    console.log('📖 Reading Mektubat JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ Mektubat JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    // Meta defaults
    data.meta = data.meta || {};
    const workSlug = data.meta.slug || 'mektubat';
    const workTitle = data.meta.title || 'Mektubat';

    // Explicitly set bookId if missing, primarily for forward compatibility
    if (!data.meta.bookId) {
        data.meta.bookId = 'risale.mektubat';
    }

    const db = getDb();
    const statements = ensureSchema(db);

    console.log(`📘 Processing Work: ${workTitle} (${workSlug})`);

    // Clear existing work/sections/paragraphs
    clearWork(db, workSlug);

    // Re-insert work entry
    // Mektubat is index 1 (Sözler=0, Lemalar=2)
    statements.insertWork.run(workSlug, workTitle, 1, 'Ana Kitaplar');

    // Ingest content (Sections & Paragraphs)
    ingestContent(db, workSlug, data, {
        ...statements,
        insertSection: statements.insertSectionOptionalBookId,
        legacyMode: true
    });

    // Note: db connection is reused or closed by shared/db logic? 
    // db.js has `getDb` which returns a singleton.
    // It's good practice to let the OS clean up or we can add closeDb if needed, 
    // but better-sqlite3 is synchronous and usually fine to leave open if process exits.
    // But verifyParity might need explicit close if it runs multiple.
}

ingestMektubat();
