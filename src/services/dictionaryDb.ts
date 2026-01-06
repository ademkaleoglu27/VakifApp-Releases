import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const DB_NAME = 'lugat_v2.db';

export interface DictionaryEntry {
    id: number;
    word_osm: string; // This corresponds to 'word' in our new DB (Ottoman spelling)
    word_tr: string;  // This corresponds to 'word_plain' in our new DB (Turkish spelling/reading)
    definition?: string; // New field
}

class DictionaryDb {
    private db: SQLite.SQLiteDatabase | null = null;
    private initialized = false;

    async init() {
        if (this.initialized && this.db) return;

        try {
            const dbDir = `${FileSystem.documentDirectory}SQLite`;
            if (!(await FileSystem.getInfoAsync(dbDir)).exists) {
                await FileSystem.makeDirectoryAsync(dbDir);
            }

            const dbPath = `${dbDir}/${DB_NAME}`;
            const fileInfo = await FileSystem.getInfoAsync(dbPath);

            // Simple asset copy logic - can be enhanced for versioning later
            if (!fileInfo.exists || fileInfo.size < 1000) {
                const asset = Asset.fromModule(require('../../assets/content/lugat_v2.db'));
                await asset.downloadAsync();
                await FileSystem.copyAsync({
                    from: asset.localUri || asset.uri,
                    to: dbPath
                });
            }

            this.db = await SQLite.openDatabaseAsync(DB_NAME);
            this.initialized = true;
        } catch (error) {
            console.error("Failed to init dictionary db:", error);
            throw error;
        }
    }

    async search(query: string): Promise<DictionaryEntry[]> {
        if (!this.initialized) await this.init();
        if (!this.db) return [];

        // Normalize query: remove special chars, maybe lowercase? 
        // For now, robust SQL parameter binding handles safety.
        // We use LIKE for standard table search.
        const likeQuery = `${query}%`;

        try {
            const results = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE word_plain LIKE ? OR word LIKE ? 
                 ORDER BY length(word_plain) ASC 
                 LIMIT 50`,
                [likeQuery, likeQuery]
            );
            return results;
        } catch (error) {
            console.error("Search error", error);
            return [];
        }
    }

    async getById(id: number): Promise<DictionaryEntry | null> {
        if (!this.initialized) await this.init();
        if (!this.db) return null;

        try {
            const result = await this.db.getFirstAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE rowid = ?`,
                [id]
            );
            return result;
        } catch (error) {
            console.error("GetById error", error);
            return null;
        }
    }

    async searchDefinition(word: string): Promise<DictionaryEntry | null> {
        const results = await this.search(word);
        return results.length > 0 ? results[0] : null;
    }
}

export const dictionaryDb = new DictionaryDb();
