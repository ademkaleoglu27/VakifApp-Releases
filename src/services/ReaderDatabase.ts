import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { PackStatus, PackErrorCode, IndexJobStatus } from '../modules/native-reader/types';

const DB_NAME = 'reader_v3.db';
const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite`;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const ReaderDatabase = {
    async init() {
        const dirInfo = await FileSystem.getInfoAsync(SQLITE_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });
        }

        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
        await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
        await this.createSchema();
    },

    async createSchema() {
        if (!dbInstance) throw new Error('DB not initialized');

        // 1. Installed Packs
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS installed_packs (
                id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                local_path TEXT,
                bytes_total INTEGER DEFAULT 0,
                bytes_downloaded INTEGER DEFAULT 0,
                error_code TEXT,
                error_message TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                installed_at DATETIME
            );
        `);

        // 2. Books Metadata
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                pack_id TEXT NOT NULL,
                title TEXT NOT NULL,
                sort_order INTEGER,
                meta_json TEXT, 
                FOREIGN KEY (pack_id) REFERENCES installed_packs(id) ON DELETE CASCADE
            );
        `);

        // 3. Sections
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS sections (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                title TEXT NOT NULL,
                sort_order INTEGER,
                file_path TEXT NOT NULL,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );
        `);

        // 4. Reading Progress
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS reading_progress (
                book_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                segment_id TEXT NOT NULL,
                char_offset INTEGER DEFAULT 0,
                last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (book_id)
            );
        `);

        // 5. Highlights
        // Added 'on delete cascade' related fields if book/section removed? 
        // Typically highlights persist or we need complex logic. For now, keep as is.
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS highlights (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                start_segment_id TEXT NOT NULL,
                end_segment_id TEXT NOT NULL,
                start_offset INTEGER NOT NULL,
                end_offset INTEGER NOT NULL,
                color TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Bookmarks
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                segment_id TEXT NOT NULL,
                char_offset INTEGER DEFAULT 0,
                label TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 7. Pagination Cache Meta
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS pagination_cache_meta (
                book_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                font_scale REAL NOT NULL,
                width INTEGER NOT NULL,
                theme_id TEXT NOT NULL,
                version TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (book_id, section_id, font_scale, width, theme_id)
            );
        `);

        // 8. Index Jobs
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS index_jobs (
                job_id TEXT PRIMARY KEY,
                pack_id TEXT NOT NULL,
                pack_version TEXT NOT NULL,
                status TEXT NOT NULL,
                cursor_json TEXT,
                progress INTEGER DEFAULT 0,
                last_error TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 9. Search Tables
        await this.createSearchTables();

        // 10. Sacred Terms
        await dbInstance.execAsync(`
            CREATE TABLE IF NOT EXISTS sacred_terms (
                term TEXT PRIMARY KEY,
                semantic_type TEXT NOT NULL,
                display_text TEXT
            );
        `);
    },

    async createSearchTables() {
        if (!dbInstance) return;
        try {
            // FTS Text
            await dbInstance.execAsync(`
                CREATE VIRTUAL TABLE IF NOT EXISTS fts_text USING fts5(
                    bookId UNINDEXED,
                    sectionId UNINDEXED,
                    segmentId UNINDEXED,
                    text,
                    tokenize='unicode61'
                );
            `);
            // FTS Titles
            await dbInstance.execAsync(`
                CREATE VIRTUAL TABLE IF NOT EXISTS fts_titles USING fts5(
                    bookId UNINDEXED,
                    sectionId UNINDEXED,
                    segmentId UNINDEXED,
                    titleText,
                    tokenize='unicode61'
                );
            `);
            // FTS Vecize
            await dbInstance.execAsync(`
                CREATE VIRTUAL TABLE IF NOT EXISTS fts_vecize USING fts5(
                    vecizeId UNINDEXED,
                    text,
                    sourceBookId UNINDEXED,
                    sourceSectionId UNINDEXED,
                    sourceSegmentId UNINDEXED,
                    tags,
                    tokenize='unicode61'
                );
            `);
        } catch (e) {
            console.error('FTS5 table creation failed', e);
        }
    },

    getDb() {
        if (!dbInstance) throw new Error('ReaderDatabase not initialized');
        return dbInstance;
    },

    async resetDb() {
        if (!dbInstance) {
            // Try to open to drop
            dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
        }

        // Drop all known tables
        const tables = [
            'sacred_terms', 'index_jobs', 'pagination_cache_meta', 'bookmarks',
            'highlights', 'reading_progress', 'sections', 'books', 'installed_packs',
            'fts_text', 'fts_titles', 'fts_vecize'
        ];

        for (const table of tables) {
            try {
                await dbInstance.execAsync(`DROP TABLE IF EXISTS ${table};`);
            } catch (e) {
                console.warn(`Failed to drop table ${table}`, e);
            }
        }

        // Re-create
        await this.createSchema();
    }
};
