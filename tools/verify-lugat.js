const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../assets/content/lugat_v2.db');

console.log(`[Lugat Check] Checking database at: ${DB_PATH}`);

if (!fs.existsSync(DB_PATH)) {
    console.error('❌ database file not found!');
    process.exit(1);
}

const db = new Database(DB_PATH);

// 1. Check Total Count
const count = db.prepare('SELECT count(*) as c FROM dictionary').get();
console.log(`[Lugat Check] Total Entries: ${count.c}`);

// 2. Check Random Entries
const randomEntries = db.prepare('SELECT * FROM dictionary ORDER BY RANDOM() LIMIT 5').all();
console.log('[Lugat Check] Random Entries Sample:');
console.table(randomEntries);

// 3. Check for Anomalies (Empty words/definitions)
const anomalies = db.prepare(`
    SELECT count(*) as c 
    FROM dictionary 
    WHERE word IS NULL OR word = '' 
       OR word_plain IS NULL OR word_plain = ''
       OR definition IS NULL OR definition = ''
`).get();

if (anomalies.c > 0) {
    console.warn(`[Lugat Check] ⚠️ Found ${anomalies.c} anomalous entries (empty word/def)!`);
} else {
    console.log('[Lugat Check] ✅ No anomalies found in text fields.');
}

// 4. Test Specific Lookup (Simulation)
const testWord = 'bedevi';
console.log(`[Lugat Check] Testing lookup for: "${testWord}"`);
const result = db.prepare('SELECT * FROM dictionary WHERE word_plain = ? OR word = ?').get(testWord, testWord);
if (result) {
    console.log(`[Lugat Check] Found: ${result.word} -> ${result.definition.substring(0, 50)}...`);
} else {
    console.warn(`[Lugat Check] ⚠️ Could not find test word "${testWord}"`);
}
