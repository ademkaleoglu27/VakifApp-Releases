const { getDb } = require('./ingest/_shared/db');
const { ensureSchema, clearWork } = require('./ingest/_shared/schema');
const { ingestContent } = require('./ingest/_shared/content');
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '../assets/risale_json/lemalar.json');

function ingestLemalar() {
    console.log('📖 Reading Lemalar JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ Lemalar JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    // Meta defaults
    const workSlug = 'lemalar';
    const workTitle = 'Lemalar';

    // Explicitly set bookId if missing
    data.meta = data.meta || {};
    if (!data.meta.bookId) {
        data.meta.bookId = 'risale.lemalar@diyanet.tr';
    }

    const db = getDb();
    const statements = ensureSchema(db);

    console.log(`📘 Processing Work: ${workTitle} (${workSlug})`);

    // Clear existing
    clearWork(db, workSlug);

    // Re-insert work
    // Lemalar order_index = 2
    statements.insertWork.run(workSlug, workTitle, 2, 'Ana Kitaplar');

    // Ingest content
    ingestContent(db, workSlug, data, {
        ...statements,
        insertSection: statements.insertSectionOptionalBookId,
        legacyMode: true,
        paragraphIndexBase: 0, // Match legacy (0-based)
        arabicAlias: false // Legacy script checked 'arabic_block' only, lemalar has 'arabic'
    });
}

ingestLemalar();
