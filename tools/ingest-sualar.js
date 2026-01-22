const { getDb } = require('./ingest/_shared/db');
const { ensureSchema, clearWork } = require('./ingest/_shared/schema');
const { ingestContent } = require('./ingest/_shared/content');
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '../assets/risale_json/sualar.json');

function ingestSualar() {
    console.log('📖 Reading Sualar JSON...');
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ Sualar JSON not found!');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

    // Meta defaults
    const workSlug = 'sualar';
    const workTitle = 'Şuâlar';
    data.meta = data.meta || {};
    if (!data.meta.bookId) {
        data.meta.bookId = 'risale.sualar@diyanet.tr';
    }

    const db = getDb();
    const statements = ensureSchema(db);

    console.log(`📘 Processing Work: Şualar (${workSlug})`);

    // Clear existing
    clearWork(db, workSlug);

    // Re-insert work
    statements.insertWork.run(workSlug, 'Şualar', 3, 'Ana Kitaplar');

    // Ingest content
    ingestContent(db, workSlug, data, {
        ...statements,
        insertSection: statements.insertSection, // Use 9-arg version
        useFullSchema: true,
        legacyMode: true, // Still legacy in other aspects (intro skip etc)
        skipIntro: true,
        sectionIdSeparator: '_',
        globalParagraphIndex: true,
        paragraphIdPattern: (slug, sectionId, index) => `${slug}_p_${index}`,
        allowedTypes: ['p', 'paragraph', 'h1', 'h2', 'h3', 'h4', 'quote', 'arabic'],

        // Sualar Specifics for Parity:
        sectionIndexStrategy: 'before',
        sectionType: 'CHAPTER', // Uppercase
        ignoreSectionText: true, // Legacy ignored block.text for sections
        titleFallback: 'Bölüm ${index}' // Legacy fallback
    });
}

ingestSualar();
