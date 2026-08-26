import * as SQLite from 'expo-sqlite';

const DB_NAME = 'library_registry.db';

export const getLibraryDb = () => {
    return SQLite.openDatabaseSync(DB_NAME);
};

export const initLibraryDb = async () => {
    const db = getLibraryDb();

    // Books Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS Books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            publisher TEXT,
            language TEXT,
            cover_image TEXT,
            default_version TEXT
        );
    `);

    // Versions Table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS BookVersions (
            book_id TEXT,
            version TEXT,
            content_hash TEXT,
            schema_type TEXT,
            content_db_path TEXT,
            release_date TEXT,
            PRIMARY KEY (book_id, version),
            FOREIGN KEY (book_id) REFERENCES Books(id)
        );
    `);

    console.log('[LibraryDB] Initialized registry tables.');
};

export const upsertBookFromManifest = async (manifest: any) => {
    const db = getLibraryDb();

    // Upsert Book
    await db.runAsync(`
        INSERT OR REPLACE INTO Books (id, title, author, publisher, language, default_version)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        manifest.book_id,
        manifest.title,
        manifest.author,
        manifest.publisher,
        manifest.language,
        manifest.default_version
    ]);

    // Upsert Versions
    for (const [ver, info] of Object.entries(manifest.versions)) {
        await db.runAsync(`
            INSERT OR REPLACE INTO BookVersions (book_id, version, content_hash, schema_type, content_db_path, release_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            manifest.book_id,
            ver,
            (info as any).content_hash,
            (info as any).schema,
            (info as any).assets?.content_db,
            (info as any).release_date
        ]);
    }
    console.log(`[LibraryDB] Upserted book: ${manifest.book_id}`);
};

export const getBookMeta = async (bookId: string) => {
    const db = getLibraryDb();
    return db.getFirstAsync<any>('SELECT * FROM Books WHERE id = ?', [bookId]);
};

export const getBookVersion = async (bookId: string, version: string) => {
    const db = getLibraryDb();
    return db.getFirstAsync<any>('SELECT * FROM BookVersions WHERE book_id = ? AND version = ?', [bookId, version]);
};
