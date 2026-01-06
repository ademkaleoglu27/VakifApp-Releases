import * as SQLite from 'expo-sqlite';

// Singleton instance
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Open the database (sync or async depending on need, async is preferred for v15)
export const getDb = async () => {
    if (!dbInstance) {
        dbInstance = await SQLite.openDatabaseAsync('vakifapp_offline.db');
    }
    return dbInstance;
};

export const initDb = async () => {
    const db = await getDb();

    // 1. Decisions Table (Mirror)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT,
            date TEXT NOT NULL,
            created_by TEXT,
            created_at TEXT,
            attachment_url TEXT
        );
    `);



    // 2. Transactions Table (Mirror)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'TRY',
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            payment_method TEXT,
            contact_id TEXT, -- Added for Dues (Aidat) Tracking
            created_by TEXT,
            created_at TEXT
        );
    `);

    // SCHEMA MIGRATION: Add columns if they don't exist
    try {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN payment_method TEXT;');
    } catch (e) { /* Column likely exists */ }
    try {
        await db.execAsync('ALTER TABLE transactions ADD COLUMN contact_id TEXT;');
    } catch (e) { /* Column likely exists */ }

    // SCHEMA MIGRATION: reading_logs created_at
    try {
        await db.execAsync('ALTER TABLE reading_logs ADD COLUMN created_at TEXT;');
    } catch (e) { /* Column likely exists */ }

    // SCHEMA MIGRATION: decisions attachment_url
    try {
        await db.execAsync('ALTER TABLE decisions ADD COLUMN attachment_url TEXT;');
    } catch (e) { /* Column likely exists */ }

    // SCHEMA MIGRATION: hatims type
    try {
        await db.execAsync('ALTER TABLE hatims ADD COLUMN type TEXT;');
    } catch (e) { /* Column likely exists */ }


    // 3. Outbox Table (For Offline Writes)
    // type: 'INSERT_DECISION', 'UPDATE_DECISION', 'INSERT_TRANSACTION', etc.
    // payload: JSON string of the data
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 4. Hatims Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS hatims (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT, -- Added
            target_date TEXT,
            status TEXT,
            created_by TEXT,
            created_at TEXT
        );
    `);

    // 5. Hatim Parts Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS hatim_parts (
            id TEXT PRIMARY KEY,
            hatim_id TEXT NOT NULL,
            juz_number INTEGER NOT NULL,
            status TEXT NOT NULL,
            assigned_to_name TEXT,
            assigned_to_id TEXT,
            updated_at TEXT
        );
    `);

    // 6. Reading Logs Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reading_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            pages_read INTEGER,
            duration_minutes INTEGER,
            date TEXT,
            created_at TEXT
        );
    `);

    // 7. KV Store (For sync timestamps)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // --- MERGED FROM RisaleUserDb ---

    // 8. Contacts (Synced)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT,
            group_type TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT
        );
    `);

    // 9. Contact Readings (Synced)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS contact_readings (
            id TEXT PRIMARY KEY,
            contact_id TEXT NOT NULL,
            pages_read INTEGER NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );
    `);

    // 10. Risale Bookmarks (Local only for now, can be synced later)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS risale_bookmarks (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(book_id, page_number)
        );
    `);

    // 11. Risale Notes (Local/Synced)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS risale_notes (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            content TEXT NOT NULL,
            color TEXT DEFAULT '#FEF3C7',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 12. Risale Decision Links
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS risale_decision_links (
            id TEXT PRIMARY KEY,
            decision_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 13. Assignments (Merged into existing logic, but table def needed if not exists)
    // Note: 'assignments' table was in RisaleUserDb, but we might want to sync it.
    // Let's use TEXT ID.
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            assigned_to_id TEXT NOT NULL,
            due_date TEXT,
            is_completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(assigned_to_id) REFERENCES contacts(id) ON DELETE CASCADE
        );
    `);

    // 14. Agenda Items
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS agenda_items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            event_date TEXT NOT NULL,
            location TEXT,
            type TEXT,
            notification_ids TEXT
        );
    `);

    // 15. Announcements
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            priority TEXT DEFAULT 'normal',
            location TEXT,
            is_read INTEGER DEFAULT 0
        );
    `);


};

// Helper: Get Last Sync Time
export const getLastSyncedAt = async (): Promise<string | null> => {
    const db = await getDb();
    const result = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM kv_store WHERE key = ?',
        ['last_synced_at']
    );
    return result?.value || null;
};

// Helper: Set Last Sync Time
export const setLastSyncedAt = async (isoDate: string) => {
    const db = await getDb();
    await db.runAsync(
        'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
        ['last_synced_at', isoDate]
    );
};
