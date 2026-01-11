const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const axios = require('axios');
const xml2js = require('xml2js');

const DB_PATH = path.join(__dirname, 'output', 'content.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const QURAN_XML_URL = 'https://raw.githubusercontent.com/cchartm16/quran/master/quran-simple.xml';

if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

async function build() {
    console.log('🏗️  Starting Database Build...');

    // 1. Apply Schema
    console.log('📝 Applying Schema...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);

    // 2. Download & Process Quran
    console.log(`📥 Downloading Quran XML from ${QURAN_XML_URL}...`);
    try {
        const response = await axios.get(QURAN_XML_URL);
        const xmlData = response.data;

        console.log('📖 Parsing Quran XML...');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        const surahs = result.quran.sura;

        const insertSurah = db.prepare('INSERT INTO q_surah (id, name_ar, name_tr, ayah_count) VALUES (?, ?, ?, ?)');
        const insertAyah = db.prepare('INSERT INTO q_ayah (surah_id, ayah_number, text_ar) VALUES (?, ?, ?)');

        const transaction = db.transaction(() => {
            for (const sura of surahs) {
                const id = parseInt(sura.$.index);
                const nameAr = sura.$.name;
                const nameTr = sura.$.tname || sura.$.name;
                const ayahs = sura.aya;

                insertSurah.run(id, nameAr, nameTr, ayahs.length);

                for (const ayah of ayahs) {
                    const ayahNum = parseInt(ayah.$.index);
                    const text = ayah.$.text;
                    insertAyah.run(id, ayahNum, text);
                }
            }
        });

        console.log('💾 Inserting Quran Data...');
        transaction();
        console.log(`✅ Inserted ${surahs.length} Surahs.`);

    } catch (error) {
        console.error('❌ Error processing Quran:', error.message);
        if (error.response) console.error('Status:', error.response.status);
        process.exit(1);
    }

    // 3. Ingest Real Risale Data from meta/books
    console.log('📚 Ingesting Real Risale Corpus from meta/books...');

    const insertWork = db.prepare('INSERT INTO works (id, title, order_index, category) VALUES (?, ?, ?, ?)');
    const insertSection = db.prepare('INSERT INTO sections (id, work_id, title, order_index, type, parent_id) VALUES (?, ?, ?, ?, ?, ?)');
    const insertParagraph = db.prepare('INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) VALUES (?, ?, ?, ?, ?, ?)');

    const booksDir = path.join(__dirname, '..', 'meta', 'books');

    if (fs.existsSync(booksDir)) {
        const bookFolders = fs.readdirSync(booksDir).filter(f => fs.statSync(path.join(booksDir, f)).isDirectory());

        const risaleTrans = db.transaction(() => {
            let workOrder = 0;

            for (const bookFolder of bookFolders) {
                const bookPath = path.join(booksDir, bookFolder);
                const sectionsPath = path.join(bookPath, 'sections.json');
                if (!fs.existsSync(sectionsPath)) continue;

                const sectionsData = JSON.parse(fs.readFileSync(sectionsPath, 'utf-8'));
                const workId = 'sozler'; // Matching app code
                const workTitle = 'Sözler';
                const category = 'Ana Kitaplar';

                insertWork.run(workId, workTitle, workOrder, category);
                console.log(`   📘 Processing Work: ${workTitle} (ID: ${workId})`);

                if (sectionsData.sections) {
                    for (const s of sectionsData.sections) {
                        const sectionId = s.sectionId;
                        const sectionType = s.type || 'main';
                        const parentId = s.parentId || null;
                        insertSection.run(sectionId, workId, s.title, s.order || 0, sectionType, parentId);
                    }
                }

                // Read pages and insert paragraphs
                const pagesDir = path.join(bookPath, 'pages');
                if (fs.existsSync(pagesDir)) {
                    const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json')).sort();
                    let paragraphCounter = 0;

                    for (const pageFile of pageFiles) {
                        const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, pageFile), 'utf-8'));
                        const pageIndex = pageData.pageIndex || 0;

                        if (pageData.segments) {
                            for (const seg of pageData.segments) {
                                const paragraphId = seg.segmentId || `p-${paragraphCounter}`;
                                const sectionId = pageData.sectionId;
                                const text = Array.isArray(seg.text) ? seg.text.join('\n') : seg.text;
                                const isArabic = (seg.lang === 'ar') ? 1 : 0;

                                insertParagraph.run(paragraphId, sectionId, text, paragraphCounter, isArabic, pageIndex);
                                paragraphCounter++;
                            }
                        }
                    }
                    console.log(`   📄 Inserted ${paragraphCounter} paragraphs`);
                }
                workOrder++;
            }
        });

        risaleTrans();
    } else {
        console.warn('⚠️ meta/books Not Found - Cannot Restore Assets');
    }

    console.log('✅ Risale Data populate complete.');

    // 4. Stats
    const qSurahCount = db.prepare('SELECT COUNT(*) as c FROM q_surah').get().c;
    const qAyahCount = db.prepare('SELECT COUNT(*) as c FROM q_ayah').get().c;
    const rParagraphCount = db.prepare('SELECT COUNT(*) as c FROM paragraphs').get().c;

    console.log('------------------------------------------------');
    console.log('🎉 Database Build Complete!');
    console.log(`📍 Location: ${DB_PATH}`);
    console.log(`📊 Stats:`);
    console.log(`   - Surahs: ${qSurahCount}`);
    console.log(`   - Ayahs: ${qAyahCount}`);
    console.log(`   - Paragraphs: ${rParagraphCount}`);
    console.log('------------------------------------------------');
}

build();
