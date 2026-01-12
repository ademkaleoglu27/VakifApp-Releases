const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../assets/risale.db'); // Adjust path if needed. risaleRepo uses 'contentDb' which usually opens a local DB file.
// Wait, risaleRepo uses `getDb`. Let's assume it's `src/services/db/risale.db` or similar? 
// The error `src/services/db/risale.db` path I used before might be wrong if I guessed it.
// Let's check `src/services/contentDb.ts` to see where the DB is.

const db = new sqlite3.Database('assets/risale.db', (err) => {
    if (err) {
        console.error('Could not open DB:', err.message);
        // Try default location if any
    } else {
        console.log('Connected to DB');
        checkSection('birinci_soz');
    }
});

function checkSection(id) {
    db.serialize(() => {
        db.all("SELECT COUNT(*) as count FROM paragraphs WHERE section_id = ?", [id], (err, rows) => {
            if (err) console.error(err);
            else console.log(`Chunks for ${id}:`, rows[0].count);
        });

        db.all("SELECT DISTINCT section_id FROM paragraphs LIMIT 10", [], (err, rows) => {
            if (err) console.error(err);
            else console.log('Sample Section IDs:', rows);
        });
    });
}
