import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { DatabaseMigration } from './databaseMigration';

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

        // 8. Enable foreign keys
        await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

        // 9. Run migrations to ensure schema is up to date
        await DatabaseMigration.migrateIfNeeded(dbInstance);

        console.log('[ContentDB] Database ready');

    } catch (error) {
        console.error('[ContentDB] Error in ensureContentDbReady:', error);
        throw error;
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
