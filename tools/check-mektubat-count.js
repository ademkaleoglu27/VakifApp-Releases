const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../assets/risale.db'));

const row = db.prepare("SELECT count(*) as c FROM sections WHERE work_id = 'mektubat'").get();
console.log('Mektubat total:', row.c);
