const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const axios = require('axios');
const xml2js = require('xml2js');

const DB_PATH = path.join(__dirname, 'output', 'content.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
// Using Zekr's reliable mirror of Tanzil XML
const QURAN_XML_URL = 'https://raw.githubusercontent.com/cchartm16/quran/master/quran-simple.xml';

// Ensure output dir exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Remove old DB
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

        // xmlData structure: <quran> <sura ...> <aya .../> </sura> </quran>
        // result.quran.sura -> Array of sura objects

        const surahs = result.quran.sura;

        const insertSurah = db.prepare('INSERT INTO q_surah (id, name_ar, name_tr, ayah_count) VALUES (?, ?, ?, ?)');
        const insertAyah = db.prepare('INSERT INTO q_ayah (surah_id, ayah_number, text_ar) VALUES (?, ?, ?)');

        const transaction = db.transaction(() => {
            for (const sura of surahs) {
                const id = parseInt(sura.$.index);
                const nameAr = sura.$.name;
                const nameTr = sura.$.tname || sura.$.name; // Fallback if tname missing
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

    // 3. Generate Risale Placeholders
    console.log('📚 Generating Risale Placeholder Data...');

    const insertWork = db.prepare('INSERT INTO r_work (title, category, order_no) VALUES (?, ?, ?)');
    const insertSection = db.prepare('INSERT INTO r_section (work_id, title, order_no) VALUES (?, ?, ?)');
    const insertChunk = db.prepare('INSERT INTO r_chunk (section_id, chunk_no, text_tr) VALUES (?, ?, ?)');

    const works = [
        { title: 'Sözler', cat: 'Ana Kitaplar' },
        { title: 'Mektubat', cat: 'Ana Kitaplar' },
        { title: 'Lemalar', cat: 'Ana Kitaplar' },
        { title: 'Şualar', cat: 'Ana Kitaplar' },
        { title: 'Asa-yı Musa', cat: 'Lahikalar' },
        { title: 'Barla Lahikası', cat: 'Lahikalar' },
        { title: 'Kastamonu Lahikası', cat: 'Lahikalar' },
        { title: 'Emirdağ Lahikası', cat: 'Lahikalar' },
        { title: 'Tarihçe-i Hayat', cat: 'Biyografi' },
        { title: 'Mesnevi-i Nuriye', cat: 'Diğer' }
    ];

    const risaleTrans = db.transaction(() => {
        let workId = 1;
        for (const work of works) {
            insertWork.run(work.title, work.cat, workId);

            // 10 Sections per work
            for (let s = 1; s <= 10; s++) {
                const sectionInfo = insertSection.run(workId, `${work.title} - Bölüm ${s}`, s);
                const realSectionId = sectionInfo.lastInsertRowid;

                // 10 Chunks per section
                for (let c = 1; c <= 10; c++) {
                    const text = `SAMPLE_RISALE_CHUNK_${String(c).padStart(4, '0')} for ${work.title} Section ${s}.\n\nBu bir test metnidir. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
                    insertChunk.run(realSectionId, c, text);
                }
            }
            workId++;
        }
    });

    risaleTrans();
    console.log('✅ Risale Data populate complete.');

    // 4. Stats
    const qSurahCount = db.prepare('SELECT COUNT(*) as c FROM q_surah').get().c;
    const qAyahCount = db.prepare('SELECT COUNT(*) as c FROM q_ayah').get().c;
    const rChunkCount = db.prepare('SELECT COUNT(*) as c FROM r_chunk').get().c;

    console.log('------------------------------------------------');
    console.log('🎉 Database Build Complete!');
    console.log(`📍 Location: ${DB_PATH}`);
    console.log(`📊 Stats:`);
    console.log(`   - Surahs: ${qSurahCount}`);
    console.log(`   - Ayahs: ${qAyahCount}`);
    console.log(`   - Risale Chunks: ${rChunkCount}`);
    console.log('------------------------------------------------');
}

build();
