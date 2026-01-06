const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../assets/content/risale_text_v2.db');
const db = new Database(dbPath, { verbose: console.log });

const BOOK_ID = 1;

try {
    console.log(`--- Checking Pagination for Book ${BOOK_ID} ---`);

    // 1) Min/Max/Count
    const stats = db.prepare('SELECT MIN(page_number) minP, MAX(page_number) maxP, COUNT(*) cnt FROM pages WHERE book_id = ?').get(BOOK_ID);
    console.log('Stats:', stats);

    // 2) Duplicates check
    const dupes = db.prepare('SELECT page_number, COUNT(*) c FROM pages WHERE book_id = ? GROUP BY page_number HAVING c > 1 LIMIT 20').all(BOOK_ID);
    console.log('Duplicates:', dupes);

    // 3) First 20 pages
    const firstPages = db.prepare('SELECT page_number, section_title FROM pages WHERE book_id = ? ORDER BY page_number ASC LIMIT 20').all(BOOK_ID);
    console.log('First 20 Pages:', firstPages);

    // 4) Check Page 5 Specifically
    const p5 = db.prepare('SELECT * FROM pages WHERE book_id = ? AND page_number = 5').get(BOOK_ID);
    console.log('Page 5:', p5);

    // 5) Check Next Page Query Logic (Simulate)
    if (p5) {
        const next = db.prepare('SELECT * FROM pages WHERE book_id = ? AND page_number > ? ORDER BY page_number ASC LIMIT 1').get(BOOK_ID, p5.page_number);
        console.log('Next Page after 5:', next);
    }

} catch (err) {
    console.error('Error:', err);
} finally {
    db.close();
}
