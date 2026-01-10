const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../assets/content/risale_text.db');
console.log('Opening DB:', dbPath);

const db = new Database(dbPath, { verbose: console.log });

try {
    const rows = db.prepare('SELECT content FROM paragraphs LIMIT 20').all();
    console.log('--- SAMPLE CONTENT ---');
    rows.forEach((r, i) => {
        console.log(`[${i}] ${r.content.substring(0, 100)}...`);
    });
} catch (e) {
    console.error('Error:', e);
}
