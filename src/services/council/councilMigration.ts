import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CouncilRepositorySQLite } from './CouncilRepositorySQLite';
import { CouncilRepositoryAsyncStorage } from './CouncilRepositoryAsyncStorage';
import { getDb, initDb } from '../db/sqlite';
import { CouncilRepository, Person } from './CouncilRepository';

const STORAGE_KEY = 'council-storage';
const META_TABLE = 'council_meta';

// Meta data interface
interface CouncilMeta {
    is_migrated: number;
    migrated_at: string;
    legacy_people_count: number;
    legacy_assignments_count: number;
}

// Helper to execute multiple statements one by one for better error reporting
function shouldNotSplit(sql: string): boolean {
    const s = sql.trim().toUpperCase();
    return (
        s.startsWith('CREATE TRIGGER') ||
        s.startsWith('CREATE VIEW') ||
        s.startsWith('CREATE VIRTUAL TABLE') ||
        (s.includes('BEGIN') && s.includes('END'))
    );
}

function splitStatements(sql: string): string[] {
    if (shouldNotSplit(sql)) return [sql.trim()];
    return sql
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
}

async function execSql(db: SQLite.SQLiteDatabase, sql: string) {
    const stmts = splitStatements(sql);
    for (const stmt of stmts) {
        try {
            if (__DEV__) console.log('[SQL]', stmt.slice(0, 100));
            await db.execAsync(stmt.endsWith(';') ? stmt : stmt + ';');
        } catch (e) {
            console.error('[SQL-FAIL]', stmt, e);
            throw e;
        }
    }
}

export const CouncilMigration = {
    // Check if legacy data exists in AsyncStorage
    async hasLegacyData(): Promise<boolean> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (!json) return false;

            // Check for valid state structure
            const data = JSON.parse(json);
            // Default persist state often wraps in { state: { ... }, version: 0 }
            const state = data.state || data;

            return (state.people?.length > 0 || state.assignments?.length > 0);
        } catch (e) {
            console.warn('[CouncilMigration] Failed to check legacy data', e);
            return false;
        }
    },

    // Check if migration has already been completed via SQLite meta table
    async isMigrated(): Promise<boolean> {
        try {
            const db = await getDb();
            // Create meta table if not exists (idempotent check)
            await execSql(db, `
                CREATE TABLE IF NOT EXISTS ${META_TABLE} (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            `);

            const result = await db.getFirstAsync<{ value: string }>(
                `SELECT value FROM ${META_TABLE} WHERE key = 'migration_status'`,
                []
            );

            if (result && result.value) {
                const meta = JSON.parse(result.value) as CouncilMeta;
                return !!meta.is_migrated;
            }
            return false;
        } catch (e) {
            console.warn('[CouncilMigration] Failed to check migration status - assuming false', e);
            return false;
        }
    },

    // Perform the migration
    async importLegacyToSQLite(): Promise<{ success: boolean; counts: any }> {
        console.log('[CouncilMigration] Starting migration...');

        // 0. Pre-check
        const alreadyMigrated = await this.isMigrated();
        if (alreadyMigrated) {
            console.log('[CouncilMigration] Already migrated. Skipping.');
            return { success: true, counts: { status: 'already_migrated' } };
        }

        const legacyRepo = new CouncilRepositoryAsyncStorage();
        const sqliteRepo = new CouncilRepositorySQLite();

        try {
            // 1. Read Legacy Data
            const people = await legacyRepo.getPeople();
            const assignments = await legacyRepo.getAssignments();

            if (people.length === 0 && assignments.length === 0) {
                console.log('[CouncilMigration] No legacy data found.');
                return { success: true, counts: { people: 0, assignments: 0 } };
            }

            console.log(`[CouncilMigration] Found ${people.length} people and ${assignments.length} assignments.`);

            // 2. Initialize SQLite (ensure tables exist)
            await initDb();
            const db = await getDb(); // Need db access for Meta

            // 3. Import People & Notes (Preserving IDs)
            for (const person of people) {
                // Ensure ID is preserved. Repository methods now support explicitly passing 'id'.
                // If legacy person somehow lacks ID, this will generate one, but legacy usually implies ID exists.
                const personId = person.id; // Legacy ID

                await sqliteRepo.addPerson({
                    id: personId, // ID Injection
                    name: person.name,
                    surname: person.surname,
                    phoneNumber: person.phoneNumber,
                    address: person.address,
                    councilType: person.councilType
                });

                // Import Notes
                if (person.notes && person.notes.length > 0) {
                    for (const note of person.notes) {
                        await sqliteRepo.addNote(personId, note.text);
                        // Note creation time might be reset or we could extend addNote too. 
                        // For notes, timestamp is less critical than assignments. Accepting reset for now.
                    }
                }
            }

            // 4. Import Assignments (Preserving IDs, Status, CreatedAt)
            let importedAssignments = 0;
            for (const task of assignments) {
                // Legacy assignments rely on assignedToId which matches the Person ID we just inserted.
                // Since we preserved Person IDs, the relationship holds.

                await sqliteRepo.addAssignment({
                    id: task.id, // Preserve ID
                    title: task.title,
                    description: task.description,
                    assignedToId: task.assignedToId,
                    dueDate: task.dueDate,
                    createdAt: task.createdAt, // Preserve Timestamp
                    isCompleted: task.isCompleted // Preserve Status
                });
                importedAssignments++;
            }

            // 5. Mark Migrated
            const meta: CouncilMeta = {
                is_migrated: 1,
                migrated_at: new Date().toISOString(),
                legacy_people_count: people.length,
                legacy_assignments_count: assignments.length
            };

            await db.runAsync(
                `INSERT OR REPLACE INTO ${META_TABLE} (key, value) VALUES (?, ?)`,
                ['migration_status', JSON.stringify(meta)]
            );

            console.log('[CouncilMigration] Migration successful.');
            return {
                success: true,
                counts: {
                    people: people.length,
                    assignments: importedAssignments
                }
            };

        } catch (error) {
            console.error('[CouncilMigration] Migration failed', error);
            // Fail Soft: Do not crash app, but report failure.
            return { success: false, counts: { error: String(error) } };
        }
    }
};
