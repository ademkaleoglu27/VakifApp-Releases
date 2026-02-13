const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../assets/risale.db'));

console.log('Checking Sualar sections...');
const sualarSections = db.prepare("SELECT * FROM sections WHERE work_id = 'sualar' LIMIT 5").all();
console.table(sualarSections);

console.log('Checking Sualar paragraphs...');
const sualarParagraphs = db.prepare("SELECT * FROM paragraphs WHERE section_id LIKE 'sualar%' LIMIT 5").all();
console.table(sualarParagraphs);

console.log('Checking Sozler sections for backfill need...');
const sozlerSections = db.prepare("SELECT section_uid, count(*) as c FROM sections WHERE work_id = 'sozler' GROUP BY section_uid LIMIT 5").all();
console.table(sozlerSections);
