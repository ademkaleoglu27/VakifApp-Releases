const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../assets/content/lugat_v2.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    console.log('--- Checking Tables ---');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables);

    if (tables.length > 0) {
        tables.forEach(t => {
            console.log(`--- Schema for ${t.name} ---`);
            const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
            console.log(columns);
        });
    }

} catch (err) {
    console.error('Error:', err);
} finally {
    db.close();
}
