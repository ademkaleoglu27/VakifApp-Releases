import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { Paragraph, Section, Work, DictionaryTerm } from './schema';

const RISALE_DB_NAME = 'risale.db';
const USER_DB_NAME = 'user.db';

let risaleDb: SQLite.SQLiteDatabase | null = null;
let userDb: SQLite.SQLiteDatabase | null = null;

/**
 * Read meta value from a SQLite database.
 * Returns null if table or key doesn't exist.
 */
const readMetaFromDb = async (db: SQLite.SQLiteDatabase, key: string): Promise<string | null> => {
    try {
        const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
        return result?.value ?? null;
    } catch (e) {
        return null;
    }
};

/**
 * Delete SQLite database file and its sidecar files (journal, wal, shm).
 */
const deleteDatabaseFiles = async (dbPath: string): Promise<void> => {
    const sidecars = ['', '-journal', '-wal', '-shm'];
    for (const suffix of sidecars) {
        const filePath = dbPath + suffix;
        try {
            const info = await FileSystem.getInfoAsync(filePath);
            if (info.exists) {
                await FileSystem.deleteAsync(filePath, { idempotent: true });
            }
        } catch { }
    }
};

/**
 * Copy asset DB to device with atomic temp-file strategy.
 * Cleans up sidecar files and verifies copy success.
 */
const copyAssetDbToDevice = async (assetLocalUri: string, targetPath: string): Promise<boolean> => {
    const tempPath = targetPath + '.tmp';

    try {
        // Clean up any existing temp file and its sidecars
        await deleteDatabaseFiles(tempPath);

        // Copy to temp file first
        await FileSystem.copyAsync({
            from: assetLocalUri,
            to: tempPath
        });

        // Verify temp file exists and has content
        const tempInfo = await FileSystem.getInfoAsync(tempPath);
        if (!tempInfo.exists || (tempInfo as any).size === 0) {
            console.error('[RisaleDB] Temp copy is empty or missing');
            await deleteDatabaseFiles(tempPath);
            return false;
        }

        // Delete old DB and its sidecars
        await deleteDatabaseFiles(targetPath);

        // Rename temp to final
        await FileSystem.moveAsync({
            from: tempPath,
            to: targetPath
        });

        // Verify final file exists and has content
        const finalInfo = await FileSystem.getInfoAsync(targetPath);
        if (!finalInfo.exists || (finalInfo as any).size === 0) {
            console.error('[RisaleDB] Final DB is empty or missing after move');
            return false;
        }

        console.log(`[RisaleDB] DB copied successfully, size=${(finalInfo as any).size || 'unknown'}`);
        return true;
    } catch (error) {
        console.error('[RisaleDB] Failed to copy asset DB:', error);
        await deleteDatabaseFiles(tempPath);
        return false;
    }
};

export const initRisaleDB = async () => {
    try {
        // Step 1: Close any existing connection FIRST to prevent cached handle issues
        if (risaleDb) {
            await risaleDb.closeAsync();
            risaleDb = null;
        }

        // Ensure SQLite directory exists
        const dbDir = FileSystem.documentDirectory + 'SQLite';
        const dirInfo = await FileSystem.getInfoAsync(dbDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
        }

        const localDbUri = dbDir + '/' + RISALE_DB_NAME;
        const deviceDbInfo = await FileSystem.getInfoAsync(localDbUri);

        // Load asset DB
        const asset = Asset.fromModule(require('../../../assets/content/risale.db'));
        await asset.downloadAsync();

        if (!asset.localUri) {
            throw new Error('Asset localUri is null');
        }

        let needsRefresh = false;
        let assetBuiltAt = 'unknown';
        let assetVersion = 'unknown';
        let deviceBuiltAt = 'none';
        let deviceVersion = 'none';

        // Phase 1: If device DB doesn't exist, copy immediately
        if (!deviceDbInfo.exists) {
            console.log('[RisaleDB] No device DB found. Copying asset DB...');
            const success = await copyAssetDbToDevice(asset.localUri, localDbUri);
            if (!success) throw new Error('Failed to copy asset DB');
            needsRefresh = false; // Already copied
        } else {
            // Phase 2: Both exist, compare versions

            // Read device DB meta
            const existingDb = await SQLite.openDatabaseAsync(RISALE_DB_NAME);
            deviceBuiltAt = await readMetaFromDb(existingDb, 'builtAt') || 'none';
            deviceVersion = await readMetaFromDb(existingDb, 'contentVersion') || 'none';
            await existingDb.closeAsync();

            // Step 4: Use unique temp name to avoid cached connection conflicts
            const tempName = `__asset_meta_check__-${Date.now()}.db`;
            const tempCheckPath = `${dbDir}/${tempName}`;

            try {
                // Clean any leftover temp files first
                await deleteDatabaseFiles(tempCheckPath);

                await FileSystem.copyAsync({
                    from: asset.localUri,
                    to: tempCheckPath
                });

                const assetDb = await SQLite.openDatabaseAsync(tempName);
                assetBuiltAt = await readMetaFromDb(assetDb, 'builtAt') || 'unknown';
                assetVersion = await readMetaFromDb(assetDb, 'contentVersion') || 'unknown';
                await assetDb.closeAsync();

                // Clean up temp file and its sidecars AFTER closing
                await deleteDatabaseFiles(tempCheckPath);
            } catch (metaError) {
                console.warn('[RisaleDB] Failed to read asset meta, skipping refresh:', metaError);
                await deleteDatabaseFiles(tempCheckPath);
                assetBuiltAt = 'unknown';
            }

            // Determine if refresh needed
            if (assetBuiltAt !== 'unknown') {
                needsRefresh = (deviceBuiltAt !== assetBuiltAt) || (deviceVersion !== assetVersion);
            } else {
                needsRefresh = false;
            }

            console.log(`[RisaleDB] asset=${assetVersion}/${assetBuiltAt}, device=${deviceVersion}/${deviceBuiltAt}, refreshing=${needsRefresh ? 'YES' : 'NO'}`);

            if (needsRefresh) {
                const success = await copyAssetDbToDevice(asset.localUri, localDbUri);
                if (!success) {
                    console.warn('[RisaleDB] Refresh failed, will use existing DB.');
                }
            }
        }

        // Step 5 & 6: Open final DB and log size
        const finalInfo = await FileSystem.getInfoAsync(localDbUri);
        console.log(`[RisaleDB] deviceDb size=${(finalInfo as any).size || 'unknown'}`);

        risaleDb = await SQLite.openDatabaseAsync(RISALE_DB_NAME);
        console.log('📖 Risale DB initialized');

        // Init User DB
        userDb = await SQLite.openDatabaseAsync(USER_DB_NAME);
        await initUserDbSchema(userDb);
        console.log('👤 User DB initialized');

    } catch (error) {
        console.error('Failed to init Risale DB:', error);
        throw error;
    }
};

const initUserDbSchema = async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id TEXT NOT NULL,
      page_key TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      section_id TEXT PRIMARY KEY,
      page_key TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id TEXT NOT NULL,
        quote TEXT,
        note_text TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
     
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
  `);
};

export const getWorks = async (): Promise<Work[]> => {
    if (!risaleDb) throw new Error('DB not init');
    return await risaleDb.getAllAsync<Work>('SELECT * FROM works ORDER BY order_index');
};

export const getSections = async (workId: string): Promise<Section[]> => {
    if (!risaleDb) throw new Error('DB not init');
    return await risaleDb.getAllAsync<Section>('SELECT * FROM sections WHERE work_id = ? ORDER BY order_index', [workId]);
};

export const getParagraphs = async (sectionId: string): Promise<Paragraph[]> => {
    if (!risaleDb) throw new Error('DB not init');
    return await risaleDb.getAllAsync<Paragraph>('SELECT * FROM paragraphs WHERE section_id = ? ORDER BY order_index', [sectionId]);
};

export const getDictionaryDefinition = async (term: string): Promise<DictionaryTerm | null> => {
    if (!risaleDb) throw new Error('DB not init');
    return await risaleDb.getFirstAsync<DictionaryTerm>('SELECT * FROM dictionary WHERE term = ?', [term]);
};

// User DB Methods
export const saveProgress = async (sectionId: string, pageKey: string) => {
    if (!userDb) return;
    await userDb.runAsync(
        'INSERT OR REPLACE INTO reading_progress (section_id, page_key, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [sectionId, pageKey]
    );
};

export const getProgress = async (sectionId: string): Promise<{ page_key: string } | null> => {
    if (!userDb) return null;
    return await userDb.getFirstAsync('SELECT page_key FROM reading_progress WHERE section_id = ?', [sectionId]);
};
