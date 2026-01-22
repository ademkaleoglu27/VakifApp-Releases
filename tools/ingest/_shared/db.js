const Database = require('better-sqlite3');
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, '../../assets/risale.db');
const DB_PATH = process.env.RISALE_DB_PATH || DEFAULT_DB_PATH;

let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        // Ensure directory exists if using temp path? 
        // Better-sqlite3 might throw if dir missing.
        // For now assume valid path.
        console.log(`🔌 Connecting to DB: ${path.basename(DB_PATH)}`);
        dbInstance = new Database(DB_PATH);
    }
    return dbInstance;
}

function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

function withTransaction(fn) {
    const db = getDb();
    const transaction = db.transaction(fn);
    return transaction();
}

module.exports = {
    getDb,
    closeDb,
    withTransaction,
    DB_PATH
};
