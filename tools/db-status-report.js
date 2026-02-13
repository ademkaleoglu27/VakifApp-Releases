const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../assets/risale.db'));

console.log('Generating status report for all works...');

const report = db.prepare(`
    SELECT 
        work_id,
        COUNT(*) as total_sections,
        SUM(CASE WHEN section_uid IS NULL THEN 1 ELSE 0 END) as missing_uid_count
    FROM sections
    GROUP BY work_id
    ORDER BY missing_uid_count DESC, total_sections DESC
`).all();

console.table(report);
