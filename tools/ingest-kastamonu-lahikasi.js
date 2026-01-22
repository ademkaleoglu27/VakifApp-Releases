const { getDb } = require('./ingest/_shared/db');
const { ensureSchema, clearWork } = require('./ingest/_shared/schema');
const { ingestContent } = require('./ingest/_shared/content');
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '../assets/risale_json/kastamonu-lahikasi.json');

function ingestKastamonu() {
    console.log('📖 Reading Kastomonu Lahikasi JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    const workSlug = 'kastamonu_lahikasi';
    const workTitle = 'Kastamonu Lâhikası';

    // Explicitly set bookId if missing
    data.meta = data.meta || {};
    if (!data.meta.bookId) {
        data.meta.bookId = 'risale.kastamonu_lahikasi@diyanet.tr';
    }

    const db = getDb();
    const statements = ensureSchema(db);

    console.log(`📘 Processing Work: ${workTitle} (${workSlug})`);

    // Clear existing
    clearWork(db, workSlug);

    // Re-insert work
    statements.insertWork.run(workSlug, workTitle, 10, 'Ana Kitaplar');

    // Ingest content
    ingestContent(db, workSlug, data, {
        ...statements,
        insertSection: statements.insertSection,
        useFullSchema: true,
        legacyMode: true,

        globalParagraphIndex: false,
        paragraphIndexBase: 0, // Legacy uses 0-based

        introType: 'main',
        sectionIdSeparator: '-',
        sectionType: 'chapter',

        allowedTypes: null
    });
}

ingestKastamonu();
