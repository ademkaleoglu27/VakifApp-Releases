import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const DB_NAME = 'lugat_v2.db';

export interface DictionaryEntry {
    id: number;
    word_osm: string; // Ottoman spelling / term
    word_tr: string;  // Turkish spelling/reading
    definition?: string;
}

class DictionaryDb {
    private db: SQLite.SQLiteDatabase | null = null;
    private initialized = false;

    async init() {
        if (this.initialized && this.db) return;

        try {
            const dbDir = `${FileSystem.documentDirectory}SQLite`;
            const dirInfo = await FileSystem.getInfoAsync(dbDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
            }

            const dbPath = `${dbDir}/${DB_NAME}`;
            const fileInfo = await FileSystem.getInfoAsync(dbPath);

            if (!fileInfo.exists || fileInfo.size < 1000) {
                try {
                    const asset = Asset.fromModule(require('../../assets/content/lugat_v2.db'));
                    await asset.downloadAsync();
                    const sourceUri = asset.localUri || asset.uri;
                    if (sourceUri) {
                        await FileSystem.copyAsync({
                            from: sourceUri,
                            to: dbPath
                        });
                    }
                } catch (assetErr) {
                    console.log('[DictionaryDb] Asset copy fallback:', assetErr);
                }
            }

            this.db = await SQLite.openDatabaseAsync(DB_NAME);
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS dictionary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    word TEXT,
                    word_plain TEXT,
                    definition TEXT
                );
            `);

            this.initialized = true;
        } catch (error) {
            console.error("Failed to init dictionary db:", error);
        }
    }

    async search(query: string): Promise<DictionaryEntry[]> {
        if (!this.initialized) await this.init();
        if (!this.db) return [];

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

    async searchExact(query: string): Promise<DictionaryEntry | null> {
        if (!this.initialized) await this.init();
        if (!this.db) return null;

        try {
            const qLower = query.toLowerCase();
            const result = await this.db.getFirstAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE lower(word_plain) = ? OR lower(word) = ?`,
                [qLower, qLower]
            );
            return result;
        } catch (error) {
            console.error("Exact search error", error);
            return null;
        }
    }

    // --- HELPER: Normalization ---
    normalize(text: string): string {
        if (!text) return "";
        let s = text.toLocaleLowerCase('tr-TR');

        s = s.replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ');
        s = s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
        s = s.replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c');
        s = s.replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i');
        s = s.replace(/[’'ʿʾ]/g, '');

        s = s.replace(/\s+/g, ' ').trim();
        return s;
    }

    // --- MAIN SEARCH: Flexible ---
    async searchFlexible(query: string): Promise<{ best: DictionaryEntry | null, candidates: DictionaryEntry[] }> {
        if (!this.initialized) await this.init();
        if (!this.db) return { best: null, candidates: [] };

        const qNorm = this.normalize(query);
        if (qNorm.length < 2) return { best: null, candidates: [] };

        try {
            const exact = await this.db.getFirstAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE lower(word_plain) = ?`,
                [qNorm]
            );

            if (exact) {
                return { best: exact, candidates: [] };
            }

            const prefixMatches = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE word_plain LIKE ? 
                 ORDER BY length(word_plain) ASC 
                 LIMIT 20`,
                [`${qNorm}%`]
            );

            let containsMatches: DictionaryEntry[] = [];

            if (prefixMatches.length < 5) {
                containsMatches = await this.db.getAllAsync<DictionaryEntry>(
                    `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                     FROM dictionary 
                     WHERE word_plain LIKE ? AND word_plain NOT LIKE ?
                     ORDER BY length(word_plain) ASC 
                     LIMIT 20`,
                    [`%${qNorm}%`, `${qNorm}%`]
                );
            }

            const allCandidates = [...prefixMatches, ...containsMatches];
            return { best: null, candidates: allCandidates };
        } catch (error) {
            console.error("Flexible search error", error);
            return { best: null, candidates: [] };
        }
    }

    async searchDefinition(word: string): Promise<DictionaryEntry | null> {
        const { best, candidates } = await this.searchFlexible(word);
        return best || (candidates.length > 0 ? candidates[0] : null);
    }
}

export const dictionaryDb = new DictionaryDb();
