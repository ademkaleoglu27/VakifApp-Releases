const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TEMP_DIR = path.join(__dirname, 'temp_parity_verify');
const LEGACY_DB = path.join(TEMP_DIR, 'legacy.db');
const NEW_DB = path.join(TEMP_DIR, 'refactored.db');

// List of all books supported
const BOOKS = [
    'sozler',
    'mektubat',
    'lemalar',
    'sualar',
    'kastamonu-lahikasi',
    'barla-lahikasi',
    'emirdag-lahikasi',
    'isaratul_icaz',
    'mesnevi_nuriye',
    'sikke-i-tasdik-i-gaybi',
    'tarihce-i-hayat'
];

let targetArg = 'all';
const args = process.argv.slice(2);
const targetIndex = args.indexOf('--target');
if (targetIndex !== -1 && args[targetIndex + 1]) {
    targetArg = args[targetIndex + 1];
} else if (args[0] && !args[0].startsWith('--')) {
    // Support direct "node verifyParity.js lemalar" too
    targetArg = args[0];
}

function createSchema(dbPath) {
    const db = new Database(dbPath);
    db.exec(`
        CREATE TABLE IF NOT EXISTS works (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            category TEXT,
            meta_json TEXT
        );
        CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            work_id TEXT NOT NULL,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            type TEXT,
            parent_id TEXT,
            FOREIGN KEY(work_id) REFERENCES works(id)
        );
        CREATE TABLE IF NOT EXISTS paragraphs (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL,
            text TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            is_arabic INTEGER DEFAULT 0,
            page_no INTEGER,
            FOREIGN KEY(section_id) REFERENCES sections(id)
        );
    `);
    db.close();
}

function setup() {
    if (fs.existsSync(TEMP_DIR)) {
        try {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        } catch (e) {
            // Ignore if busy, but warn
            console.warn('Warning: Could not clear temp dir. Ideally close DB viewers.');
        }
    }
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR);
    }

    // Bootstrap Schema
    createSchema(LEGACY_DB);
    createSchema(NEW_DB);
}

function runScript(scriptPath, dbPath) {
    // console.log(`🏃 Running ${path.basename(scriptPath)}...`);
    try {
        execSync(`node "${scriptPath}"`, {
            env: { ...process.env, RISALE_DB_PATH: dbPath },
            stdio: 'pipe' // Suppress output to keep summary clean, or 'inherit' for debug
        });
    } catch (e) {
        console.error(`❌ Script failed: ${scriptPath}`);
        // console.error(e.stdout.toString());
        // console.error(e.stderr.toString());
        return false;
    }
    return true;
}

function getTableHash(dbPath, tableName, workIdFilter = null) {
    const db = new Database(dbPath);
    let rows;
    if (workIdFilter) {
        if (tableName === 'works') {
            rows = db.prepare(`SELECT * FROM ${tableName} WHERE id = ? ORDER BY id`).all(workIdFilter);
        } else if (tableName === 'sections') {
            rows = db.prepare(`SELECT * FROM ${tableName} WHERE work_id = ? ORDER BY id`).all(workIdFilter);
        } else if (tableName === 'paragraphs') {
            // Need to join? Or filtering by section_id pattern? 
            // Best to rely on clean DBs per run.
            // If we run ALL, DBs accumulate.
            // Strategy: CLEAR DB between runs? 
            // Or filter by work slug.
            // Paragraph doesn't have work_id directly.
            // We can fetch sections first.
            const sectionIds = db.prepare('SELECT id FROM sections WHERE work_id = ?').all(workIdFilter).map(s => s.id);
            if (sectionIds.length === 0) {
                rows = [];
            } else {
                const place = sectionIds.map(() => '?').join(',');
                rows = db.prepare(`SELECT * FROM ${tableName} WHERE section_id IN (${place}) ORDER BY id`).all(...sectionIds);
            }
        }
    } else {
        rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY id`).all();
    }

    // Normalize rows for hash (remove ephemeral fields if needed? None for matching)
    // Make sure column order is deterministic.
    const normalized = rows.map(r => {
        return Object.keys(r).sort().reduce((obj, key) => {
            obj[key] = r[key];
            return obj;
        }, {});
    });

    const content = JSON.stringify(normalized);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const count = rows.length;
    db.close();
    return { hash, count };
}

function verifyBook(book) {
    const slug = book.replace(/-/g, '_'); // Approximation
    // Actually we need the work_id. 
    // Let's assume the script filename maps to book target.
    // The DB will contain whatever the script inserts.
    // If we clear DB between runs, we don't need work_id filtering.

    // Paths
    const legacyScript = path.join(__dirname, `_legacy/ingest-${book}.legacy.js`);
    const newScript = path.join(__dirname, `../../tools/ingest-${book}.js`);

    if (!fs.existsSync(legacyScript)) {
        return { status: 'SKIP', reason: 'No Legacy' };
    }
    if (!fs.existsSync(newScript)) {
        return { status: 'FAIL', reason: 'No Refactor' };
    }

    // Clear DBs for isolation
    setup();

    // Run
    if (!runScript(legacyScript, LEGACY_DB)) return { status: 'FAIL', reason: 'Legacy Runtime Error' };
    if (!runScript(newScript, NEW_DB)) return { status: 'FAIL', reason: 'Refactor Runtime Error' };

    // Compare
    const tables = ['works', 'sections', 'paragraphs'];
    const failures = [];

    for (const table of tables) {
        const legacy = getTableHash(LEGACY_DB, table);
        const refactored = getTableHash(NEW_DB, table);

        if (legacy.count !== refactored.count) {
            failures.push(`${table} Count (${legacy.count} vs ${refactored.count})`);
        } else if (legacy.hash !== refactored.hash) {
            failures.push(`${table} Hash`);
        }
    }

    if (failures.length > 0) {
        return { status: 'FAIL', reason: failures.join(', ') };
    }
    return { status: 'PASS' };
}

function run() {
    console.log(`🔎 Verifying Parity for targets: ${targetArg === 'all' ? 'ALL' : targetArg}`);
    console.log('---------------------------------------------------');
    console.log(pad('Book', 25) + pad('Status', 10) + 'Notes');
    console.log('---------------------------------------------------');

    const targets = targetArg === 'all' ? BOOKS : [targetArg];
    let hasFailure = false;

    for (const book of targets) {
        const result = verifyBook(book);
        const color = result.status === 'PASS' ? '\x1b[32m' : '\x1b[31m'; // Green/Red
        const reset = '\x1b[0m';

        console.log(pad(book, 25) + color + pad(result.status, 10) + reset + (result.reason || ''));

        if (result.status === 'FAIL') hasFailure = true;
    }
    console.log('---------------------------------------------------');

    if (hasFailure) {
        console.error('💥 Verification Failed for one or more books.');
        process.exit(1);
    } else {
        console.log('🎉 All Verified Successfully.');
        process.exit(0);
    }
}

function pad(str, len) {
    return (str + ' '.repeat(len)).substring(0, len);
}

run();
