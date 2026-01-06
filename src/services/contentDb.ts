import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';

const DB_NAME = 'content.db';
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
        // We cannot use Asset.fromModule on a JSON object, it throws "Module [object Object] missing from registry".
        const targetMeta = require('../../assets/content/content.meta.json') as MetaData;


        // 3. Load DB Asset
        // content.db must be treated as an asset by Metro (see metro.config.js)
        const dbAsset = Asset.fromModule(require('../../assets/content/content.db'));

        // We don't downloadAsync() metaAsset because we already required the content.
        // However, we MUST ensure the DB asset is available locally if it's a remote asset (in dev client often local).
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

        // 5. Copy if needed
        if (installNeeded) {

            // Delete existing to be safe
            if (dbInfo.exists) {
                await FileSystem.deleteAsync(DB_PATH);
            }

            if (!dbAsset.localUri) {
                throw new Error('Database asset localUri is null');
            }

            await FileSystem.copyAsync({
                from: dbAsset.localUri,
                to: DB_PATH
            });

            // Write new meta
            await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(targetMeta));

        } else {

        }

        // 6. Open Database
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

        // Optional: Pragma execution to enable foreign keys
        await dbInstance.execAsync(`PRAGMA foreign_keys = ON;`);

    } catch (error) {
        console.error('Error in ensureContentDbReady:', error);
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
