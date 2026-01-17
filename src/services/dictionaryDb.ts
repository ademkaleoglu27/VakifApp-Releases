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

    async searchExact(query: string): Promise<DictionaryEntry | null> {
        if (!this.initialized) await this.init();
        if (!this.db) return null;

        try {
            // Try Exact Match (Case Insensitive)
            // SQL's standard '=' is case-sensitive depending on collation.
            // We force lowercase comparison to be safe.
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

        // Remove Punctuation
        s = s.replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ');

        // Replacements
        s = s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
        s = s.replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c');
        s = s.replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i');
        // Hamza/Apostrophe removal
        s = s.replace(/[’'ʿʾ]/g, '');

        // Whitespace cleanup
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
            // 1. EXACT Match (Normalized)
            // Note: We assume the DB has a normalized-ish 'word_plain' or similar, 
            // but if not, we rely on LIKE being somewhat permissive or the data being clean.
            // Our DB schema: word (osm), word_plain (tr), definition.

            // Try explicit exact on word_plain
            const exact = await this.db.getFirstAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE lower(word_plain) = ?`, // OR word LIKE ? can be added
                [qNorm]
            );

            if (exact) {
                return { best: exact, candidates: [] };
            }

            // 2. PREFIX Match (Starts with...)
            const prefixMatches = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE word_plain LIKE ? 
                 ORDER BY length(word_plain) ASC 
                 LIMIT 20`,
                [`${qNorm}%`]
            );

            // 3. CONTAINS Match (If prefix yields few results, maybe expand? or just combine?)
            // Let's get contains as well to be safe, especially if prefix is empty.
            let containsMatches: DictionaryEntry[] = [];

            if (prefixMatches.length < 5) {
                containsMatches = await this.db.getAllAsync<DictionaryEntry>(
                    `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                     FROM dictionary 
                     WHERE word_plain LIKE ? AND word_plain NOT LIKE ?
                     ORDER BY length(word_plain) ASC 
                     LIMIT 20`,
                    [`%${qNorm}%`, `${qNorm}%`] // Exclude those already found in prefix
                );
            }

            // Combine
            const allCandidates = [...prefixMatches, ...containsMatches];

            // If we found candidates but no exact, return best as null (to trigger list UI)
            // OR if there is a very strong first candidate (short length diff), maybe auto-select?
            // For now, let the UI decide.

            return { best: null, candidates: allCandidates };

        } catch (error) {
            console.error("Flexible search error", error);
            return { best: null, candidates: [] };
        }
    }

    async searchDefinition(word: string): Promise<DictionaryEntry | null> {
        // Fallback or deprecated wrapper
        const { best, candidates } = await this.searchFlexible(word);
        return best || (candidates.length > 0 ? candidates[0] : null);
    }
}

export const dictionaryDb = new DictionaryDb();
