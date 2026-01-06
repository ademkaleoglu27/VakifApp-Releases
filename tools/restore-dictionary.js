const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const SQL_FILE = path.join(__dirname, '../db_lugat.sql');
const DB_FILE = path.join(__dirname, '../assets/content/lugat_v2.db');

console.log(`Reading SQL from ${SQL_FILE}...`);
let sqlContent = fs.readFileSync(SQL_FILE, 'utf8');

// Basic cleanup for MySQL -> SQLite conversion
console.log('Cleaning up SQL...');
const lines = sqlContent.split('\n');
const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed === '') return false;
    if (trimmed.startsWith('SET ')) return false;
    if (trimmed.startsWith('LOCK TABLES')) return false;
    if (trimmed.startsWith('UNLOCK TABLES')) return false;
    return true;
});

let cleanSql = filteredLines.join('\n');

// Replace MySQL syntax
// Replace MySQL syntax
cleanSql = cleanSql.replace(/AUTO_INCREMENT=\d+/g, '');
cleanSql = cleanSql.replace(/ENGINE=[a-zA-Z0-9_]+/g, '');
cleanSql = cleanSql.replace(/DEFAULT CHARSET=[a-zA-Z0-9_]+/g, '');
cleanSql = cleanSql.replace(/COLLATE=[a-zA-Z0-9_]+/g, '');
cleanSql = cleanSql.replace(/UNSIGNED/gi, '');
cleanSql = cleanSql.replace(/int\(\d+\)/gi, 'INTEGER');
cleanSql = cleanSql.replace(/smallint\(\d+\)/gi, 'INTEGER');
cleanSql = cleanSql.replace(/tinyint\(\d+\)/gi, 'INTEGER');
cleanSql = cleanSql.replace(/char\(\d+\)/gi, 'TEXT');
cleanSql = cleanSql.replace(/varchar\(\d+\)/gi, 'TEXT');
cleanSql = cleanSql.replace(/text/gi, 'TEXT');
cleanSql = cleanSql.replace(/character set [a-z0-9_]+/gi, '');
cleanSql = cleanSql.replace(/collate [a-z0-9_]+/gi, '');

// Schema Migration (Rename tables and columns)
cleanSql = cleanSql.replace(/`db_lugat`/g, '`dictionary`');
cleanSql = cleanSql.replace(/`kelime`/g, '`word`');
cleanSql = cleanSql.replace(/`kirpilmis`/g, '`word_plain`');
cleanSql = cleanSql.replace(/`anlam`/g, '`definition`');

// Primary Key Fix
// Match `id` ... AUTO_INCREMENT, loosely
cleanSql = cleanSql.replace(/`id`\s+INTEGER\s*.*AUTO_INCREMENT/gi, '`id` INTEGER PRIMARY KEY AUTOINCREMENT');

// If AUTO_INCREMENT still exists (e.g. didn't match headers), remove it to prevent syntax error
// (But we want ID to be autoincrementing if possible. If regex above worked, this is fine).
// The table level AUTO_INCREMENT=... was already removed.
// If there are other AUTO_INCREMENT usages, they are invalid in SQLite column defs without PRIMARY KEY.
cleanSql = cleanSql.replace(/AUTO_INCREMENT/gi, '');

// Remove separate PRIMARY KEY definitions and Keys
cleanSql = cleanSql.replace(/,\s*PRIMARY KEY \(`id`\)/gi, '');

cleanSql = cleanSql.replace(/,\s*KEY `[^`]+` \(`[^`]+`\)/g, ''); // Simplified key removal
cleanSql = cleanSql.replace(/,\s*KEY `indeks` \([^)]+\)/g, ''); // Specific key removal if above fails

// Remove comma before closing parenthesis if needed (due to removed lines)
// This is hard to do with simple regex on the whole string without context.
// But mostly cleaning lines works better.

// Add more replacements if needed, but basic dumps usually work with these

// Quote fix? MySQL might use backticks, SQLite supports them usually but let's see.

// Ensure directory exists
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Create DB
console.log(`Creating database at ${DB_FILE}...`);
if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
}

const db = new Database(DB_FILE);

// Execute
// The dump might be one huge transaction or individual inserts.
// better-sqlite3 exec supports multiple statements.
try {
    console.log('Executing SQL...');
    db.exec(cleanSql);
    console.log('Database restored successfully!');
} catch (error) {
    console.error('Error executing SQL:', error);
    process.exit(1);
} finally {
    db.close();
}
