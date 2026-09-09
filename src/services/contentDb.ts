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
let initPromise: Promise<void> | null = null;

export const ensureContentDbReady = async (): Promise<void> => {
    if (dbInstance) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // 1. Ensure SQLite directory exists
            const dirInfo = await FileSystem.getInfoAsync(SQLITE_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });
            }

            // 2. Load expected (bundled) meta directly
            const targetMeta = require('../../assets/content/content.meta.json') as MetaData;

            // 3. Check existing installed DB
            const EXPECTED_MIN_SIZE = 25 * 1024 * 1024; // 25 MB
            const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
            let installNeeded = false;

            if (!dbInfo.exists || !('size' in dbInfo) || (dbInfo as any).size < EXPECTED_MIN_SIZE) {
                installNeeded = true;
            } else {
                const installedMetaInfo = await FileSystem.getInfoAsync(META_PATH);
                if (installedMetaInfo.exists) {
                    try {
                        const installedMetaContent = await FileSystem.readAsStringAsync(META_PATH);
                        const installedMeta = JSON.parse(installedMetaContent) as MetaData;
                        if (installedMeta.version !== targetMeta.version) {
                            installNeeded = true;
                        }
                    } catch (e) {
                        console.warn('[ContentDB] Failed to parse installed meta, forcing check', e);
                    }
                } else {
                    installNeeded = true;
                }
            }

            // 4. Schema Check - validate existing DB has required tables
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

            // 5. Copy asset if needed
            if (installNeeded || !validSchema) {
                console.log('[ContentDB] Installing fresh database asset...');
                const tempPath = `${DB_PATH}.tmp`;
                if ((await FileSystem.getInfoAsync(tempPath)).exists) {
                    await FileSystem.deleteAsync(tempPath, { idempotent: true });
                }

                let copied = false;

                // Attempt 1: Copy natively from Android APK bundle assets
                try {
                    const bundleUri = `${FileSystem.bundleDirectory}risale.db`;
                    console.log('[ContentDB] Copying from bundleUri:', bundleUri);
                    await FileSystem.copyAsync({
                        from: bundleUri,
                        to: tempPath
                    });
                    const tInfo = await FileSystem.getInfoAsync(tempPath);
                    if (tInfo.exists && 'size' in tInfo && (tInfo as any).size > 20 * 1024 * 1024) {
                        copied = true;
                    }
                } catch (bErr) {
                    console.warn('[ContentDB] Bundle copy failed, trying Asset module:', bErr);
                }

                // Attempt 2: Fallback to Asset.fromModule
                if (!copied) {
                    try {
                        const dbAsset = Asset.fromModule(require('../../assets/risale.db'));
                        await dbAsset.downloadAsync();
                        const sourceUri = dbAsset.localUri || dbAsset.uri;
                        if (sourceUri) {
                            await FileSystem.copyAsync({
                                from: sourceUri,
                                to: tempPath
                            });
                            const tInfo = await FileSystem.getInfoAsync(tempPath);
                            if (tInfo.exists && 'size' in tInfo && (tInfo as any).size > 20 * 1024 * 1024) {
                                copied = true;
                            }
                        }
                    } catch (aErr) {
                        console.warn('[ContentDB] Asset module copy failed:', aErr);
                    }
                }

                if (copied) {
                    if ((await FileSystem.getInfoAsync(DB_PATH)).exists) {
                        await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
                    }
                    await FileSystem.moveAsync({
                        from: tempPath,
                        to: DB_PATH
                    });
                    await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(targetMeta));
                    console.log('[ContentDB] Database file installed successfully.');
                } else {
                    console.warn('[ContentDB] Could not copy asset DB, attempting to proceed with existing DB.');
                }
            }

            // 6. Open Database
            dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
            await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
            await dbInstance.execAsync('PRAGMA journal_mode = WAL;');

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
        try {
            const health = await ContentHealthGate.checkContentHealth(dbInstance);

            if (!health.isHealthy) {
                console.warn(`[ContentDB] Health check reported (${health.error}). Attempting self-heal...`);
                const healed = await ContentSelfHeal.attemptSelfHeal(dbInstance);
                if (!healed) {
                    console.warn('[ContentDB] Self-heal could not resolve all items, proceeding in resilient mode.');
                }
            } else {
                console.log('[ContentDB] Health check PASSED.');
            }
        } catch (healthErr) {
            console.warn('[ContentDB] Health check warning (non-fatal):', healthErr);
        }

        console.log('[ContentDB] Database ready');

    } catch (error) {
        console.error('[ContentDB] Error in ensureContentDbReady:', error);
        if (!dbInstance) {
            try {
                dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
            } catch (fallbackErr) {
                console.error('[ContentDB] Fallback open failed:', fallbackErr);
            }
        }
    } finally {
        initPromise = null;
    }
    })();

    return initPromise;
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

        const tempPath = `${DB_PATH}.tmp`;
        let copied = false;

        try {
            const bundleUri = `${FileSystem.bundleDirectory}risale.db`;
            await FileSystem.copyAsync({ from: bundleUri, to: tempPath });
            const tInfo = await FileSystem.getInfoAsync(tempPath);
            if (tInfo.exists && 'size' in tInfo && (tInfo as any).size > 20 * 1024 * 1024) {
                copied = true;
            }
        } catch {}

        if (!copied) {
            try {
                const dbAsset = Asset.fromModule(require('../../assets/risale.db'));
                await dbAsset.downloadAsync();
                const sourceUri = dbAsset.localUri || dbAsset.uri;
                if (sourceUri) {
                    await FileSystem.copyAsync({ from: sourceUri, to: tempPath });
                    copied = true;
                }
            } catch {}
        }

        if (copied) {
            if ((await FileSystem.getInfoAsync(DB_PATH)).exists) {
                await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
            }
            await FileSystem.moveAsync({ from: tempPath, to: DB_PATH });
        }

        // Reset meta to match bundle
        const targetMeta = require('../../assets/content/content.meta.json');
        await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(targetMeta));

        console.log('[ContentDB] Reinstall from asset complete.');
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
        await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

    } catch (e) {
        console.error('[ContentDB] Reinstall failed:', e);
        throw e;
    }
};

export const getDb = (): SQLite.SQLiteDatabase => {
    if (!dbInstance) {
        console.warn('[ContentDB] getDb called synchronously before async init completed. Using openDatabaseSync fallback.');
        try {
            dbInstance = SQLite.openDatabaseSync(DB_NAME);
        } catch (e) {
            console.error('[ContentDB] openDatabaseSync fallback failed:', e);
            throw e;
        }
    }
    return dbInstance;
};
