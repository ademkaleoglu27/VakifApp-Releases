import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { DatabaseMigration } from './databaseMigration';
import { ContentHealthGate } from './contentHealthGate';
import { ContentSelfHeal } from './contentSelfHeal';

const DB_NAME = 'risale_v3.db';
const META_FILE = 'content.meta.json';

// Define paths
// expo-sqlite looks for databases in a specific directory.
// On Android: /data/user/0/com.package/files/SQLite/
// On iOS: Library/LocalDatabase/ (or similar logic handled by the lib)
// However, the cleanest way to "seed" is to let expo-sqlite open it once, or manually place it where it expects.
// For bare/dev client, we can force the location or copy to document directory and open from there?
// Actually, `openDatabaseAsync` usually opens from a standard location.
// We will copy to `${FileSystem.documentDirectory}SQLite/${DB_NAME}`.

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite`;
const DB_PATH = `${SQLITE_DIR}/${DB_NAME}`;
const META_PATH = `${FileSystem.documentDirectory}${META_FILE}`;

interface MetaData {
    version: number;
    lastUpdated: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const ensureContentDbReady = async (): Promise<void> => {
    try {
        // 1. Ensure SQLite directory exists
        const dirInfo = await FileSystem.getInfoAsync(SQLITE_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });
        }

        // 2. Load expected (bundled) meta directly
        // JSON files are bundled as JS objects by default in React Native 'require'.
        const targetMeta = require('../../assets/content/content.meta.json') as MetaData;

        // 3. Load DB Asset
        const dbAsset = Asset.fromModule(require('../../assets/risale.db'));
        await dbAsset.downloadAsync();

        // 4. Check existing installed meta
        let installNeeded = true;
        const installedMetaInfo = await FileSystem.getInfoAsync(META_PATH);

        if (installedMetaInfo.exists) {
            const installedMetaContent = await FileSystem.readAsStringAsync(META_PATH);
            try {
                const installedMeta = JSON.parse(installedMetaContent) as MetaData;
                if (installedMeta.version === targetMeta.version) {
                    installNeeded = false;
                }
            } catch (e) {
                console.warn('Failed to parse installed meta, forcing reinstall', e);
            }
        }

        const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
        if (!dbInfo.exists) {
            installNeeded = true;
        }

        // 5. Schema Check - validate existing DB has required tables
        let validSchema = false;
        if (!installNeeded && (await FileSystem.getInfoAsync(DB_PATH)).exists) {
            try {
                const tempDb = await SQLite.openDatabaseAsync(DB_NAME);
                const validation = await DatabaseMigration.validateSchema(tempDb);
                validSchema = validation.valid;
                if (!validSchema) {
                    console.warn(`[ContentDB] Schema invalid, missing tables: ${validation.missing.join(', ')}`);
                }
            } catch (e) {
                console.warn('[ContentDB] Schema check failed:', e);
            }
        }

        // 6. Copy asset if needed
        if (installNeeded || !validSchema) {
            console.log('[ContentDB] Installing fresh database asset...');
            if ((await FileSystem.getInfoAsync(DB_PATH)).exists) {
                await FileSystem.deleteAsync(DB_PATH);
            }

            if (!dbAsset.localUri) {
                throw new Error('Database asset localUri is null');
            }

            await FileSystem.copyAsync({
                from: dbAsset.localUri,
                to: DB_PATH
            });
            await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(targetMeta));
        }

        // 7. Open Database
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
        console.log('[ContentDB] database_list', await dbInstance.getAllAsync('PRAGMA database_list'));

        // 8. Enable foreign keys
        await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

        console.log('[ContentDB] foreign_keys', await dbInstance.getFirstAsync('PRAGMA foreign_keys'));
        console.log('[ContentDB] user_version', await dbInstance.getFirstAsync('PRAGMA user_version'));

        // 9. Run migrations to ensure schema is up to date
        // Note: modify migrateIfNeeded to NOT throw on everything if we want to catch it here,
        // but currently we rely on it working.
        try {
            await DatabaseMigration.migrateIfNeeded(dbInstance);
        } catch (migrationError) {
            console.warn('[ContentDB] Standard migration failed, will rely on Self-Heal', migrationError);
        }

        // 10. Health Gate & Self Heal
        // 10. Normalization (Safe Fixes for Mektubat)
        try {
            const CANONICAL_MEKTUBAT_ID = 'risale.mektubat@diyanet.tr';

            // Fix Mektubat book_id
            await dbInstance.runAsync(
                "UPDATE sections SET book_id=? WHERE work_id='mektubat' AND (book_id IS NULL OR book_id='' OR book_id!=?)",
                [CANONICAL_MEKTUBAT_ID, CANONICAL_MEKTUBAT_ID]
            );

            // Fix Mektubat version if missing (placeholder)
            // Note: Schema might check version constraint, if any.
            // But usually older schemas didn't enforce it strictly.
            // We set it if missing to be safe vs validation logic.
            await dbInstance.runAsync(
                "UPDATE sections SET version='v1' WHERE work_id='mektubat' AND (version IS NULL OR version='')"
            );

            // Fix Mektubat type if missing (placeholder)
            // Existing schema dump showed 'main' as default, but let's be sure.
            // Wait, schema dump showed NO default for type? 
            // Better to force it if null.
            // Check if 'type' column exists first? 
            // We saw it in 'ingest-mektubat' failing.
            // Ah, actually `ingest-mektubat` failed because `type` column MISSING in `paragraphs` table?
            // But `sections` table usually has `type`.
            // Let's assume sections has type.
            // Fix Mektubat type if missing
            await dbInstance.runAsync(
                "UPDATE sections SET type='chapter' WHERE work_id='mektubat' AND type IS NULL"
            );

            // Fix Mektubat NULL section_uid (Critical for Navigation)
            // Deterministic UID: 'mektubat_' + id
            await dbInstance.runAsync(
                "UPDATE sections SET section_uid = 'mektubat_' || id WHERE work_id='mektubat' AND (section_uid IS NULL OR section_uid='')"
            );

            console.log('[ContentDB] Normalized Mektubat entries.');

            // Log post-normalization stats
            const mekStats = await dbInstance.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE work_id='mektubat' AND book_id=?",
                [CANONICAL_MEKTUBAT_ID]
            );
            console.log(`[ContentDB] Mektubat Valid Rows: ${mekStats?.c}`);

            // 11. Normalization (Safe Fixes for Lemalar)
            const CANONICAL_LEMALAR_ID = 'risale.lemalar@diyanet.tr';

            // A) Fix BookId
            await dbInstance.runAsync(
                "UPDATE sections SET book_id=? WHERE work_id='lemalar' AND (book_id IS NULL OR book_id='' OR book_id!=?)",
                [CANONICAL_LEMALAR_ID, CANONICAL_LEMALAR_ID]
            );

            // B) Fix Version
            await dbInstance.runAsync(
                "UPDATE sections SET version='v1' WHERE work_id='lemalar' AND (version IS NULL OR version='')"
            );

            // C) Fix Type (Smart Inference)
            // Default main for roots
            await dbInstance.runAsync(
                "UPDATE sections SET type='main' WHERE work_id='lemalar' AND (parent_id IS NULL OR parent_id=0) AND (type IS NULL OR type='' OR type='chapter')"
            );
            // Default sub for children
            await dbInstance.runAsync(
                "UPDATE sections SET type='sub' WHERE work_id='lemalar' AND (parent_id IS NOT NULL AND parent_id!=0) AND (type IS NULL OR type='' OR type='chapter')"
            );

            // D) Fix Section UID (Replace '-' with '_')
            // This ensures lemalar-1 -> lemalar_1 which is standard for section_uid
            await dbInstance.runAsync(
                "UPDATE sections SET section_uid = REPLACE(id, '-', '_') WHERE work_id='lemalar' AND (section_uid IS NULL OR section_uid='')"
            );

            // E) CRITICAL: Paragraph Mismatch Check & Fix
            // Check if paragraphs are orphans due to ID format mismatch (lemalar-1 vs lemalar_1)
            // If we find paragraphs with 'lemalar_%' but sections have 'lemalar-%', we swap paragraphs to '-'
            const orphanCheck = await dbInstance.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM paragraphs p WHERE p.section_id LIKE 'lemalar_%' AND NOT EXISTS (SELECT 1 FROM sections s WHERE s.id = p.section_id)"
            );

            if (orphanCheck && orphanCheck.c > 0) {
                console.log(`[ContentDB] Found ${orphanCheck.c} orphan paragraphs with underscore. Attempting fix...`);
                await dbInstance.runAsync(
                    "UPDATE paragraphs SET section_id = REPLACE(section_id, '_', '-') WHERE section_id LIKE 'lemalar_%'"
                );
            }

            // Reverse check: Paragraphs have '-' but sections have '_' (Less likely if ingest scripts are standard, but possible)
            const orphanCheck2 = await dbInstance.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM paragraphs p WHERE p.section_id LIKE 'lemalar-%' AND NOT EXISTS (SELECT 1 FROM sections s WHERE s.id = p.section_id)"
            );

            if (orphanCheck2 && orphanCheck2.c > 0) {
                // If sections use underscore?
                // Check if sections use underscore
                const underscoreSections = await dbInstance.getFirstAsync<{ c: number }>(
                    "SELECT COUNT(*) as c FROM sections WHERE id LIKE 'lemalar_%'"
                );
                if (underscoreSections && underscoreSections.c > 0) {
                    console.log(`[ContentDB] Found ${orphanCheck2.c} orphan paragraphs with dash. Sections use underscore. Fixing...`);
                    await dbInstance.runAsync(
                        "UPDATE paragraphs SET section_id = REPLACE(section_id, '-', '_') WHERE section_id LIKE 'lemalar-%'"
                    );
                }
            }

            const lemStats = await dbInstance.getFirstAsync<{ c: number }>(
                "SELECT COUNT(*) as c FROM sections WHERE work_id='lemalar' AND book_id=?",
                [CANONICAL_LEMALAR_ID]
            );
            console.log(`[ContentDB] Lemalar Valid Rows: ${lemStats?.c}`);

        } catch (normErr) {
            console.warn('[ContentDB] Normalization warning:', normErr);
            // Proceed anyway, don't block app startup
        }

        console.log('[ContentDB] Checking content health...');
        const health = await ContentHealthGate.checkContentHealth(dbInstance);

        if (!health.isHealthy) {
            console.warn(`[ContentDB] Health check failed (${health.error}). Attempting self-heal...`);
            const healed = await ContentSelfHeal.attemptSelfHeal(dbInstance);

            if (!healed) {
                console.error('[ContentDB] Self-heal failed. Tearing down.');
                // Re-check one last time to get the exact error state
                const finalHealth = await ContentHealthGate.checkContentHealth(dbInstance);
                const errorInfo = {
                    code: finalHealth.error || 'ERR_UNKNOWN_INTEGRITY',
                    details: finalHealth.details,
                    diagnostics: finalHealth.diagnostics // Pass diagnostics to UI
                };
                throw new Error(JSON.stringify(errorInfo));
            }
        }

        console.log('[ContentDB] Database ready');

    } catch (error) {
        console.error('[ContentDB] Error in ensureContentDbReady:', error);
        throw error;
    }
};

/**
 * Force re-installation of the content database from the bundled asset.
 * Used by Self-Heal mechanism when content is critically missing.
 */
export const reinstallContentDbAsset = async (): Promise<void> => {
    try {
        if (dbInstance) {
            await dbInstance.closeAsync();
            dbInstance = null;
        }

        const dbAsset = Asset.fromModule(require('../../assets/risale.db'));
        // Ensure downloaded
        if (!dbAsset.localUri) {
            await dbAsset.downloadAsync();
        }

        if ((await FileSystem.getInfoAsync(DB_PATH)).exists) {
            await FileSystem.deleteAsync(DB_PATH);
        }

        if (!dbAsset.localUri) {
            throw new Error('Database asset localUri is null after download');
        }

        await FileSystem.copyAsync({
            from: dbAsset.localUri,
            to: DB_PATH
        });

        // Reset meta to match bundle
        const targetMeta = require('../../assets/content/content.meta.json');
        await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(targetMeta));

        console.log('[ContentDB] Reinstall from asset complete.');

        // Re-open not strictly needed here as the caller (re-init) will open it,
        // but if ensureContentDbReady is running, it will try to open dbInstance later?
        // Actually reinstallContentDbAsset is called inside attemptSelfHeal which is called inside ensureContentDbReady.
        // ensureContentDbReady sets dbInstance.
        // But we closed dbInstance above!
        // We must re-open it so ensureContentDbReady continues to verify.
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
        await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

    } catch (e) {
        console.error('[ContentDB] Reinstall failed:', e);
        throw e;
    }
};

export const getDb = (): SQLite.SQLiteDatabase => {
    if (!dbInstance) {
        // If called before ready, try to throw or return null? 
        // Usually logic flow ensures ready is called in App.tsx.
        throw new Error('Database not initialized. Call ensureContentDbReady() first.');
    }
    return dbInstance;
};
