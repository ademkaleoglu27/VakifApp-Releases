import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { DatabaseMigration } from './databaseMigration';

const SOZLER_BOOK_ID = 'risale.sozler@diyanet.tr';
const FINGERPRINT_KEY = 'content_db_fingerprint';

export interface DbFingerprint {
    schemaVersion: number;
    sozlerCount: number;
    nullUidCount: number;
    mainSectionCount: number;
    timestamp: number;
    duplicates?: any[];
}

export interface DbDiagnostics {
    integrity_check: string;
    quick_check: string;
    foreign_key_check_count: number;
    user_version: number;
    index_list: any[];
    null_uid_count: number;
    duplicate_uid_count: number;
    null_book_id_count: number;
}

export interface HealthCheckResult {
    isHealthy: boolean;
    error?: string;
    details?: DbFingerprint;
    diagnostics?: DbDiagnostics;
}

export const ContentHealthGate = {
    // ... existings methods ...

    async generateFingerprint(db: SQLite.SQLiteDatabase): Promise<DbFingerprint> {
        const schemaVersion = await DatabaseMigration.getSchemaVersion(db);

        const sozlerCountRes = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM sections WHERE book_id = ?`,
            [SOZLER_BOOK_ID]
        );

        const nullUidRes = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM sections WHERE book_id = ? AND section_uid IS NULL`,
            [SOZLER_BOOK_ID]
        );

        const mainCountRes = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM sections WHERE book_id = ? AND type = 'main'`,
            [SOZLER_BOOK_ID]
        );

        return {
            schemaVersion,
            sozlerCount: sozlerCountRes?.count ?? 0,
            nullUidCount: nullUidRes?.count ?? 0,
            mainSectionCount: mainCountRes?.count ?? 0,
            timestamp: Date.now(),
        };
    },

    async saveFingerprint(fingerprint: DbFingerprint): Promise<void> {
        try {
            await SecureStore.setItemAsync(FINGERPRINT_KEY, JSON.stringify(fingerprint));
        } catch (e) {
            console.warn('[ContentHealthGate] Failed to save fingerprint', e);
        }
    },

    async loadFingerprint(): Promise<DbFingerprint | null> {
        try {
            const json = await SecureStore.getItemAsync(FINGERPRINT_KEY);
            return json ? JSON.parse(json) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Runs detailed diagnostics for error reporting
     */
    async runDiagnostics(db: SQLite.SQLiteDatabase): Promise<DbDiagnostics> {
        try {
            const integrityRow = await db.getFirstAsync<any>('PRAGMA integrity_check(1)');
            const quickRow = await db.getFirstAsync<any>('PRAGMA quick_check(1)');

            const integrity = integrityRow ? String(Object.values(integrityRow)[0]) : 'unknown';
            const quick = quickRow ? String(Object.values(quickRow)[0]) : 'unknown';

            // foreign_key_check returns rows violating FKs
            const fkCheck = await db.getAllAsync('PRAGMA foreign_key_check');

            const userVer = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
            const indexes = await db.getAllAsync('PRAGMA index_list(sections)');

            const nullUid = await db.getFirstAsync<{ c: number }>(
                `SELECT COUNT(*) as c FROM sections WHERE book_id=? AND section_uid IS NULL`,
                [SOZLER_BOOK_ID]
            );

            const dupUid = await db.getAllAsync(
                `SELECT section_uid, COUNT(*) as c FROM sections WHERE book_id=? GROUP BY section_uid HAVING c>1 LIMIT 20`,
                [SOZLER_BOOK_ID]
            );

            const nullBookId = await db.getFirstAsync<{ c: number }>(
                `SELECT COUNT(*) as c FROM sections WHERE work_id='sozler' AND (book_id IS NULL OR book_id='')`
            );

            return {
                integrity_check: integrity,
                quick_check: quick,
                foreign_key_check_count: fkCheck.length,
                user_version: userVer?.user_version || 0,
                index_list: indexes,
                null_uid_count: nullUid?.c || 0,
                duplicate_uid_count: dupUid.length,
                null_book_id_count: nullBookId?.c || 0
            };
        } catch (e) {
            console.error('[ContentHealthGate] Diagnostics failed:', e);
            return {
                integrity_check: 'error',
                quick_check: 'error',
                foreign_key_check_count: -1,
                user_version: -1,
                index_list: [],
                null_uid_count: -1,
                duplicate_uid_count: -1,
                null_book_id_count: -1
            };
        }
    },

    async checkContentHealth(db: SQLite.SQLiteDatabase): Promise<HealthCheckResult> {
        try {
            // 0. Runtime Diagnostics (Always run to detect corruption early)
            const diagnostics = await this.runDiagnostics(db);

            // 1. Critical Integrity Check
            if (diagnostics.integrity_check !== 'ok') {
                console.error('[ContentHealthGate] Integrity Check FAILED.', diagnostics);
                return { isHealthy: false, error: 'ERR_DB_INTEGRITY_FAIL', diagnostics };
            }

            // 1B. Column Verification
            try {
                const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sections)');
                const columnNames = new Set(columns.map(c => c.name));
                const required = ['book_id', 'version', 'section_uid'];
                const missing = required.filter(c => !columnNames.has(c));
                if (missing.length > 0) {
                    return { isHealthy: false, error: 'ERR_SCHEMA_COLUMNS_MISSING', details: { missing } as any, diagnostics };
                }
            } catch (e) {
                return { isHealthy: false, error: 'ERR_SCHEMA_CHECK_FAIL', diagnostics };
            }

            // 1C. Unique Index Verification
            try {
                const indexes = await db.getAllAsync<{ name: string; unique: number }>('PRAGMA index_list(sections)');
                const hasUniqueIndex = indexes.some(idx =>
                    (idx.name === 'idx_sections_book_uid' && idx.unique === 1)
                );
                if (!hasUniqueIndex) {
                    return { isHealthy: false, error: 'ERR_UNIQUE_INDEX_MISSING', diagnostics };
                }
            } catch (e) {
                console.warn('[ContentHealthGate] Index check failed', e);
            }

            // 2. Generate current fingerprint
            const currentFp = await this.generateFingerprint(db);

            // 3. Evaluate criteria
            if (currentFp.schemaVersion < 2) {
                return { isHealthy: false, error: 'ERR_SCHEMA_VERSION_LOW', details: currentFp, diagnostics };
            }

            if (currentFp.sozlerCount === 0) {
                return { isHealthy: false, error: 'ERR_SOZLER_MISSING', details: currentFp, diagnostics };
            }

            if (currentFp.nullUidCount > 0) {
                return { isHealthy: false, error: 'ERR_UID_NULL', details: currentFp, diagnostics };
            }

            // 1D. Main Section Count Check (Refined)
            if (currentFp.mainSectionCount === 0) {
                return { isHealthy: false, error: 'ERR_MAIN_SECTIONS_MISSING', details: currentFp, diagnostics };
            }

            // 1E. Duplicate UID Check
            try {
                const duplicates = await db.getAllAsync<{ section_uid: string }>(
                    `SELECT section_uid, COUNT(*) as c FROM sections WHERE book_id=? GROUP BY section_uid HAVING c>1 LIMIT 5`,
                    [SOZLER_BOOK_ID]
                );
                if (duplicates.length > 0) {
                    return { isHealthy: false, error: 'ERR_UID_DUPLICATE', details: { ...currentFp, duplicates }, diagnostics };
                }
            } catch (e) {
                console.warn('[ContentHealthGate] Duplicate check failed', e);
            }

            await this.saveFingerprint(currentFp);

            await this.saveFingerprint(currentFp);

            console.log('[ContentHealthGate] DIAGNOSTICS_SUMMARY:', {
                check: 'OK',
                diagnostics: {
                    integrity: diagnostics.integrity_check,
                    quick: diagnostics.quick_check,
                    null_uids: diagnostics.null_uid_count,
                    duplicate_uids: diagnostics.duplicate_uid_count,
                    null_book_ids: diagnostics.null_book_id_count
                }
            });

            return { isHealthy: true, details: currentFp, diagnostics };

        } catch (error) {
            console.error('[ContentHealthGate] Check failed:', error);
            // Diagnostics might be unavailable if diagnostics call itself failed or wasn't reached, 
            // but we can try to return what we have if we defined it outside try block? 
            // No, diagnostics is defined inside try. 
            // We'll return generic error.
            return { isHealthy: false, error: 'ERR_CHECK_EXCEPTION' };
        }
    }
};
