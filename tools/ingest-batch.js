const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const db = new Database(DB_PATH);

const TARGET_BOOKS = [
    { slug: 'sunuhat', id: 'risale.sunuhat@diyanet.tr', title: 'Sünuhat', order: 14, json: 'sunuhat.json' },
    { slug: 'isarat_k', id: 'risale.isarat_k@diyanet.tr', title: 'İşarat', order: 15, json: 'isarat_k.json' },
    { slug: 'tuluat', id: 'risale.tuluat@diyanet.tr', title: 'Tulûat', order: 16, json: 'tuluat.json' },
    { slug: 'nurunilkkapisi', id: 'risale.nurunilkkapisi@diyanet.tr', title: "Nur'un İlk Kapısı", order: 17, json: 'nurunilkkapisi.json' },
    { slug: 'nurcesmesi', id: 'risale.nurcesmesi@diyanet.tr', title: 'Nur Çeşmesi', order: 18, json: 'nurcesmesi.json' },
    { slug: 'divaniharbi', id: 'risale.divaniharbi@diyanet.tr', title: 'Divan-ı Harb-i Örfî', order: 19, json: 'divaniharbi.json' },
    { slug: 'hutbe', id: 'risale.hutbe@diyanet.tr', title: 'Hutbe-i Şamiye', order: 20, json: 'hutbe.json' },
    { slug: 'munazarat', id: 'risale.munazarat@diyanet.tr', title: 'Münazarat', order: 21, json: 'munazarat.json' },
    { slug: 'genclik', id: 'risale.genclik@diyanet.tr', title: 'Gençlik Rehberi', order: 22, json: 'genclik.json' },
    { slug: 'hanimlar', id: 'risale.hanimlar@diyanet.tr', title: 'Hanımlar Rehberi', order: 23, json: 'hanimlar.json' },
    { slug: 'konferans', id: 'risale.konferans@diyanet.tr', title: 'Konferans', order: 24, json: 'konferans.json' },
    { slug: 'tilsimlar', id: 'risale.tilsimlar@diyanet.tr', title: 'Tılsımlar', order: 25, json: 'tilsimlar.json' }
];

function runBatchvIngest() {
    console.log('🚀 Starting Batch Ingestion...');

    // Prepared Statements
    const insertWork = db.prepare(`
        INSERT OR REPLACE INTO works (id, title, order_index, category) 
        VALUES (?, ?, ?, ?)
    `);

    const insertSection = db.prepare(`
        INSERT INTO sections (id, work_id, title, order_index, type, parent_id, section_uid, book_id, version) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParagraph = db.prepare(`
        INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const deleteParas = db.prepare("DELETE FROM paragraphs WHERE section_id IN (SELECT id FROM sections WHERE work_id = ?)");
    const deleteSections = db.prepare("DELETE FROM sections WHERE work_id = ?");

    db.transaction(() => {
        for (const book of TARGET_BOOKS) {
            console.log(`\n📘 Processing: ${book.title} (${book.slug})`);

            const jsonPath = path.join(__dirname, `../assets/risale_json/${book.json}`);
            if (!fs.existsSync(jsonPath)) {
                console.error(`❌ JSON not found: ${jsonPath}`);
                continue;
            }

            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const blocks = data.blocks || [];

            // Clean
            deleteParas.run(book.slug);
            deleteSections.run(book.slug);

            // Insert Work
            insertWork.run(book.slug, book.title, book.order, 'Ana Kitaplar');

            let sectionIndex = 0;
            let paragraphIndex = 0;
            let currentSection = null;

            for (const block of blocks) {
                if (block.type === 'section') {
                    sectionIndex++;
                    const sectionId = `${book.slug}_${sectionIndex}`;
                    currentSection = sectionId;

                    insertSection.run(
                        sectionId,
                        book.slug,
                        block.title || `Bölüm ${sectionIndex}`,
                        sectionIndex,
                        'CHAPTER',
                        null,
                        sectionId,
                        book.id,
                        'v1'
                    );
                } else if (['p', 'paragraph', 'h1', 'h2', 'h3', 'h4', 'quote', 'arabic'].includes(block.type)) {
                    if (!currentSection) continue;

                    paragraphIndex++;
                    const isArabic = block.type === 'arabic' ? 1 : 0;

                    insertParagraph.run(
                        `${book.slug}_p_${paragraphIndex}`,
                        currentSection,
                        block.text,
                        paragraphIndex,
                        isArabic,
                        0
                    );
                }
            }
            console.log(`✅ Ingested ${sectionIndex} sections, ${paragraphIndex} paragraphs.`);
        }
    })(); // Execute Transaction

    console.log('\n✨ Batch Ingestion Complete!');
}

runBatchvIngest();
