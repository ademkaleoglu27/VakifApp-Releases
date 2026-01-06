const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../assets/content/risale_text_v2.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    console.log('--- Checking for HTML Tags ---');
    // Look for generic tag start
    const exampleHtml = db.prepare("SELECT * FROM paragraphs WHERE text_original LIKE '%<%' OR text_original LIKE '%>%' LIMIT 5").all();
    console.log('Found paragraphs with < or > :', exampleHtml.length);
    if (exampleHtml.length > 0) {
        console.log(exampleHtml);
    }

    // Look specifically for span class="arabic"
    const arabicSpans = db.prepare("SELECT * FROM paragraphs WHERE text_original LIKE '%<span class=\"arabic\"%' LIMIT 5").all();
    console.log('Found arabic spans:', arabicSpans.length);
    if (arabicSpans.length > 0) {
        console.log(arabicSpans);
    }

} catch (err) {
    console.error('Error:', err);
} finally {
    db.close();
}
