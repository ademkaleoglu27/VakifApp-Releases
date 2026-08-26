/**
 * Database Migration Service
 * 
 * Manages schema versioning using PRAGMA user_version.
 * Ensures all required tables exist and creates them if missing.
 * Provides FTS5 setup for fulltext search.
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { backfillSozlerSectionUid } from './backfill/sozlerSectionUidBackfill';

// Current schema version - increment when making breaking changes
const CURRENT_SCHEMA_VERSION = 2; // Upgraded to V2 for World-Standard Identity

const DB_NAME = 'risale_v3.db';
const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite`;

/**
 * Get the current schema version from the database
 */
export async function getSchemaVersion(db: SQLite.SQLiteDatabase): Promise<number> {
    try {
        const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        return result?.user_version ?? 0;
    } catch (e) {
        console.warn('[Migration] Failed to get schema version:', e);
        return 0;
    }
}

/**
 * Set the schema version in the database
 */
export async function setSchemaVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
    await db.execAsync(`PRAGMA user_version = ${version}`);
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(db: SQLite.SQLiteDatabase, tableName: string): Promise<boolean> {
    try {
        const result = await db.getFirstAsync<{ count: number }>(
            `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName]
        );
        return (result?.count ?? 0) > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Create core corpus tables if they don't exist
 * Tables: works, sections, paragraphs (chunks)
 */
export async function createCorpusTables(db: SQLite.SQLiteDatabase): Promise<void> {
    console.log('[Migration] Creating corpus tables...');

    // Works table (e.g., Sözler, Mektubat)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS works (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            category TEXT,
            meta_json TEXT
        );
    `);

    // Sections table (e.g., Birinci Söz, İkinci Mektup)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            work_id TEXT NOT NULL,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            type TEXT,
            FOREIGN KEY(work_id) REFERENCES works(id)
        );
        CREATE INDEX IF NOT EXISTS idx_sections_work ON sections(work_id);
    `);

    // Paragraphs/Chunks table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS paragraphs (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL,
            text TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            is_arabic INTEGER DEFAULT 0,
            page_no INTEGER,
            FOREIGN KEY(section_id) REFERENCES sections(id)
        );
        CREATE INDEX IF NOT EXISTS idx_paragraphs_section ON paragraphs(section_id);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_section_order ON paragraphs(section_id, order_index);
    `);

    // Metadata table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    console.log('[Migration] Corpus tables created successfully');
}

/**
 * V2 Migration: World Standard Book Identity
 * Adds book_id, section_uid, and version columns.
 * Backfills "Sözler" with deterministic UIDs.
 */
export async function migrateToV2(db: SQLite.SQLiteDatabase): Promise<void> {
    console.log('[Migration] Running migration to version 2 (World Standard Identity)...');

    // 1. Add Columns
    try {
        await db.execAsync('ALTER TABLE sections ADD COLUMN book_id TEXT;');
        await db.execAsync('ALTER TABLE sections ADD COLUMN section_uid TEXT;');
        await db.execAsync('ALTER TABLE sections ADD COLUMN version TEXT;');
    } catch (e) {
        console.log('[Migration] Columns might already exist, continuing...', e);
    }

    // 2. Backfill Logic for "Sözler"
    await backfillSozlerSectionUid(db);

    // 3. Create Indexes
    await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_book_uid ON sections(book_id, section_uid);
        CREATE INDEX IF NOT EXISTS idx_sections_book_lookup ON sections(book_id);
    `);

    console.log('[Migration] V2 migration completed successfully.');
}

/**
 * Backfill Logic extracted for V2 Migration
 */
// backfillSozlerSectionUid is now imported from ./backfill/sozlerSectionUidBackfill


/**
 * Create FTS5 virtual tables for fulltext search
 */
export async function createFtsTables(db: SQLite.SQLiteDatabase): Promise<void> {
    console.log('[Migration] Creating FTS5 tables...');

    try {
        // FTS for paragraph text search
        await db.execAsync(`
            CREATE VIRTUAL TABLE IF NOT EXISTS paragraphs_fts USING fts5(
                text,
                content='paragraphs',
                content_rowid='rowid',
                tokenize='unicode61'
            );
        `);

        // Triggers to keep FTS in sync with main table
        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS paragraphs_ai AFTER INSERT ON paragraphs BEGIN
                INSERT INTO paragraphs_fts(rowid, text) VALUES (new.rowid, new.text);
            END;
        `);

        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS paragraphs_ad AFTER DELETE ON paragraphs BEGIN
                INSERT INTO paragraphs_fts(paragraphs_fts, rowid, text) VALUES('delete', old.rowid, old.text);
            END;
        `);

        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS paragraphs_au AFTER UPDATE ON paragraphs BEGIN
                INSERT INTO paragraphs_fts(paragraphs_fts, rowid, text) VALUES('delete', old.rowid, old.text);
                INSERT INTO paragraphs_fts(rowid, text) VALUES (new.rowid, new.text);
            END;
        `);

        console.log('[Migration] FTS5 tables created successfully');
    } catch (e) {
        // FTS5 might not be available on all devices
        console.warn('[Migration] FTS5 creation failed (may not be supported):', e);
    }
}

/**
 * Create dictionary table if it doesn't exist
 */
export async function createDictionaryTable(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS dictionary (
            term TEXT PRIMARY KEY,
            meaning TEXT NOT NULL
        );
    `);
}

/**
 * Validate that essential tables exist
 */
export async function validateSchema(db: SQLite.SQLiteDatabase): Promise<{ valid: boolean; missing: string[] }> {
    const requiredTables = ['works', 'sections', 'paragraphs'];
    const missing: string[] = [];

    for (const table of requiredTables) {
        if (!(await tableExists(db, table))) {
            missing.push(table);
        }
    }

    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * Run migrations if needed
 * This is the main entry point for database initialization
 */
export async function migrateIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
    try {
        const currentVersion = await getSchemaVersion(db);
        console.log(`[Migration] Current schema version: ${currentVersion}, Target: ${CURRENT_SCHEMA_VERSION}`);

        // If schema is already up to date, just validate
        if (currentVersion >= CURRENT_SCHEMA_VERSION) {
            const validation = await validateSchema(db);
            if (!validation.valid) {
                console.warn(`[Migration] Schema valid but tables missing: ${validation.missing.join(', ')}`);
                // Attempt to create missing tables
                await createCorpusTables(db);
            }
            return;
        }

        // Run migrations based on version
        if (currentVersion < 1) {
            console.log('[Migration] Running migration to version 1...');
            await createCorpusTables(db);
            await createDictionaryTable(db);
            await createFtsTables(db);
        }

        if (currentVersion < 2) {
            await migrateToV2(db);
        }

        // Update schema version
        await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
        console.log(`[Migration] Schema updated to version ${CURRENT_SCHEMA_VERSION}`);

    } catch (error) {
        console.error('[Migration] Migration failed:', error);
        throw error;
    }
}

/**
 * Full database initialization with migration
 */
export async function initDatabaseWithMigration(): Promise<SQLite.SQLiteDatabase> {
    // Ensure SQLite directory exists
    const dirInfo = await FileSystem.getInfoAsync(SQLITE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });
    }

    // Open database
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Run migrations
    await migrateIfNeeded(db);

    return db;
}

export const DatabaseMigration = {
    getSchemaVersion,
    setSchemaVersion,
    tableExists,
    createCorpusTables,
    createFtsTables,
    createDictionaryTable,
    validateSchema,
    migrateIfNeeded,
    initDatabaseWithMigration,
    backfillSozlerSectionUid, // Exported for Self-Heal
    CURRENT_SCHEMA_VERSION,
};
