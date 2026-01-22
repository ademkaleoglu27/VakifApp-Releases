const { getDb } = require('./ingest/_shared/db');
const { ensureSchema, clearWork } = require('./ingest/_shared/schema');
const { ingestContent } = require('./ingest/_shared/content');
const fs = require('fs');
const path = require('path');

const JSON_FILENAME = 'barla-lahikasi.json';
const WORK_SLUG = 'barla_lahikasi';
const WORK_TITLE = 'Barla Lâhikası';
const ORDER_INDEX = 9;
const BOOK_ID = 'risale.barla_lahikasi@diyanet.tr';

const JSON_PATH = path.join(__dirname, '../assets/risale_json/' + JSON_FILENAME);

function ingestBook() {
    console.log(`📖 Reading ${WORK_TITLE} JSON...`);
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    data.meta = data.meta || {};
    if (!data.meta.bookId) {
        data.meta.bookId = BOOK_ID;
    }

    const db = getDb();
    const statements = ensureSchema(db);

    console.log(`📘 Processing Work: ${WORK_TITLE} (${WORK_SLUG})`);

    clearWork(db, WORK_SLUG);
    statements.insertWork.run(WORK_SLUG, WORK_TITLE, ORDER_INDEX, 'Ana Kitaplar');

    ingestContent(db, WORK_SLUG, data, {
        ...statements,
        insertSection: statements.insertSection,
        useFullSchema: true,
        legacyMode: true,
        globalParagraphIndex: false,
        paragraphIndexBase: 0,
        introType: 'main',
        sectionIdSeparator: '-',
        sectionType: 'chapter',
        allowedTypes: null
    });
}

ingestBook();
