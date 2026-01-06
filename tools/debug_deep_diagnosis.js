const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../assets/content/risale_text_v2.db');
const db = new Database(dbPath);

console.log('--- DB Schema (pages) ---');
const pragma = db.prepare('PRAGMA table_info(pages)').all();
console.log(pragma);

console.log('\n--- Book 1 Page Order (First 30) ---');
const pages = db.prepare('SELECT page_id, page_number, section_title FROM pages WHERE book_id = 1 ORDER BY page_number ASC LIMIT 30').all();
console.log(pages);

console.log('\n--- Book 1 Page Order (Check for Gaps/Jumps) ---');
const allPages = db.prepare('SELECT page_number FROM pages WHERE book_id = 1 ORDER BY page_number ASC').all();
let prev = 0;
let jumps = 0;
for (const p of allPages) {
    if (p.page_number !== prev + 1) {
        console.log(`JUMP DETECTED: ${prev} -> ${p.page_number}`);
        jumps++;
        if (jumps > 5) break;
    }
    prev = p.page_number;
}
if (jumps === 0) console.log('No sequence jumps found.');


console.log('\n--- Full File List Book 1 (Check Naming) ---');
const SOURCE_DIR = path.join(__dirname, 'risale_source_data', 'obsidian-markdown');
const items = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
const bookDir = items.find(item => item.isDirectory() && item.name.startsWith('01'));
if (bookDir) {
    const files = fs.readdirSync(path.join(SOURCE_DIR, bookDir.name));
    // Print non-standard files (not starting with digit)
    const oddFiles = files.filter(f => !/^\d/.test(f));
    console.log('Odd Files:', oddFiles);
    // Print last 5 files
    console.log('Last 5 Files:', files.sort().slice(-5));
}
