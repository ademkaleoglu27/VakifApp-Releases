const db = require('better-sqlite3')('c:/VakifApp/assets/content/risale.db');

try {
    const p = db.prepare("SELECT text FROM paragraphs WHERE section_id = 'sozler-2' LIMIT 5").all();
    console.log('Sample Text:', JSON.stringify(p, null, 2));
} catch (e) {
    console.log('Error querying paragraphs:', (e as Error).message);
}
