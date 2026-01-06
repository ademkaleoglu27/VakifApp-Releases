const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, '../assets/content/lugat_v2.db');

console.log(`Testing database at ${DB_FILE}...`);

try {
    const db = new Database(DB_FILE, { readonly: true, fileMustExist: true });

    // Check table structure
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    // Check row count
    const count = db.prepare("SELECT COUNT(*) as count FROM dictionary").get();
    console.log('Total entries:', count.count);

    // Sample query
    const sample = db.prepare("SELECT * FROM dictionary WHERE word LIKE 'A%' LIMIT 3").all();
    console.log('Sample entries:', sample);

    // Check for a specific word known to be in the dump (id 5: AB-I ADALET)
    const specific = db.prepare("SELECT * FROM dictionary WHERE id = 5").get();
    console.log('Entry ID 5:', specific);

    console.log('Verification PASSED ✅');
    db.close();
} catch (error) {
    console.error('Verification FAILED ❌', error);
    process.exit(1);
}
