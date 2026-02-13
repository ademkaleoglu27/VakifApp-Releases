const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../assets/risale.db'));

console.log('Checking for missing section_uids across all works...');
const missingCounts = db.prepare(`
    SELECT work_id, COUNT(*) as missing_count 
    FROM sections 
    WHERE section_uid IS NULL 
    GROUP BY work_id
`).all();

console.log('Missing section_uids by work:', missingCounts);

const totalCounts = db.prepare(`
    SELECT work_id, COUNT(*) as total_count 
    FROM sections 
    WHERE work_id = 'sozler'
`).all();

console.log('Total sections in Sozler:', totalCounts);
