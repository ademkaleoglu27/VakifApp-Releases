const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../assets/content/lugat_v2.db');
const db = new Database(DB_PATH);

const wordsToCheck = ['düşman', 'dusman', 'aduvv', 'hasım'];

console.log('--- Direct Search ---');
wordsToCheck.forEach(w => {
    const res = db.prepare('SELECT * FROM dictionary WHERE word_plain LIKE ? OR word LIKE ?').all(`%${w}%`, `%${w}%`);
    console.log(`Results for "${w}":`, res.length > 0 ? res.map(r => `${r.word} (${r.word_plain})`) : 'NONE');
});

console.log('\n--- Normalize Check ---');
// Mimic the normalization in dictionaryDb.ts
const normalize = (text) => {
    let s = text.toLocaleLowerCase('tr-TR');
    s = s.replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ');
    s = s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
    s = s.replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c');
    s = s.replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i');
    return s.replace(/\s+/g, ' ').trim();
};

const norm = normalize('düşman');
console.log(`Normalized "düşman" -> "${norm}"`);

console.log('\n--- Broad Check ---');
const dWords = db.prepare("SELECT word, word_plain FROM dictionary WHERE word_plain LIKE 'd%' LIMIT 10").all();
console.log('Words starting with D:');
console.table(dWords);

const aWords = db.prepare("SELECT word, word_plain FROM dictionary WHERE word_plain LIKE 'a%' LIMIT 10").all();
console.table(aWords);

