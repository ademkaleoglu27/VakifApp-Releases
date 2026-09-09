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

            // Ensure 122k dictionary database (16.5 MB) is copied
            const EXPECTED_MIN_SIZE = 15 * 1024 * 1024; // 15 MB
            if (!fileInfo.exists || !('size' in fileInfo) || (fileInfo as any).size < EXPECTED_MIN_SIZE) {
                try {
                    const bundleUri = `${FileSystem.bundleDirectory}${DB_NAME}`;
                    console.log('[DictionaryDb] Copying lugat_v2.db from bundle:', bundleUri);
                    await FileSystem.copyAsync({ from: bundleUri, to: dbPath });
                } catch (assetErr) {
                    console.warn('[DictionaryDb] Asset copy error:', assetErr);
                    // Fallback using asset:/ direct path if bundleDirectory differs
                    try {
                        console.log('[DictionaryDb] Trying asset:/lugat_v2.db fallback...');
                        await FileSystem.copyAsync({ from: `asset:/${DB_NAME}`, to: dbPath });
                    } catch (assetFallbackErr) {
                        console.warn('[DictionaryDb] asset:/ fallback error:', assetFallbackErr);
                    }
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

            // Verify database contents
            try {
                const countRow = await this.db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM dictionary');
                console.log('[DictionaryDb] Initialized successfully. Total entries:', countRow?.count);
            } catch (cntErr) {
                console.warn('[DictionaryDb] Count check warning:', cntErr);
            }

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

    // --- HELPER: Base Character Normalization ---
    normalizeBase(text: string): string {
        if (!text) return "";
        let s = text.toLocaleLowerCase('tr-TR');

        // Normalize circumflex vowels
        s = s.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/ê/g, 'e').replace(/ô/g, 'o');
        // Normalize Turkish specific characters to plain ascii
        s = s.replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c');
        s = s.replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i');
        // Strip apostrophe variants
        s = s.replace(/[’'ʿʾ`]/g, '');
        return s;
    }

    // Legacy normalize for backward compatibility
    normalize(text: string): string {
        if (!text) return "";
        let s = this.normalizeBase(text);
        s = s.replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();
        return s;
    }

    // --- HELPER: Strip Turkish Suffixes and Punctuation ---
    cleanWordForLugat(rawWord: string): string {
        if (!rawWord) return "";
        let s = rawWord.trim();

        // 1. Remove surrounding quotes, brackets, parentheses
        s = s.replace(/^[«"'(“‘\[\(\s]+|[»"')”’\]\)\s]+$/g, '');
        // 2. Remove trailing punctuation: .,;:!?...
        s = s.replace(/[.,;:!?…]+$/g, '');
        // 3. Remove Turkish possessive/case suffixes attached with apostrophe
        // e.g., Sâni'-i Zülcelâl'in -> Sâni'-i Zülcelâl, Rahmân'a -> Rahmân, Güneş'in -> Güneş
        s = s.replace(/['’ʼ`](?:in|ın|ün|un|nin|nın|nün|nun|den|dan|ten|tan|e|a|ye|ya|i|ı|u|ü|yi|yı|yu|yü|de|da|te|ta|le|la|yle|yla|dir|dır|dür|dur|tir|tır|tür|tur|deki|daki)$/i, '');
        // 4. Strip trailing punctuation again
        s = s.replace(/[.,;:!?…]+$/g, '');
        return s.trim();
    }

    // --- HELPER: Generate Search Keys (Izafet + Suffix Variants) ---
    getSearchKeys(rawWord: string): string[] {
        const cleaned = this.cleanWordForLugat(rawWord);
        const keys = new Set<string>();
        if (!cleaned) return [];

        // Common attached suffixes without apostrophe
        const attachedSuffixes = [
            /(?:lar|ler)(?:ın|in|un|ün|ı|i|u|ü|a|e|da|de|dan|den)?$/i,
            /(?:ını|ini|unu|ünü|nı|ni|nu|nü)$/i,
            /(?:ında|inde|unda|ünde|nda|nde)$/i,
            /(?:ından|inden|undan|ünden|ndan|nden)$/i,
            /(?:ına|ine|una|üne|na|ne)$/i,
            /(?:ıyla|iyle|uyla|üyle|yla|yle)$/i,
            /(?:ımız|imiz|umuz|ümüz|mız|miz|muz|müz)$/i,
            /(?:ınız|iniz|unuz|ünüz)$/i,
            /(?:dan|den|tan|ten)$/i,
            /(?:da|de|ta|te)$/i,
            /(?:ya|ye)$/i,
            /(?:yı|yi|yu|yü)$/i,
            /(?:ın|in|un|ün)$/i,
            /(?:ı|i|u|ü)$/i,
        ];

        const forms = [cleaned];
        for (const pat of attachedSuffixes) {
            if (pat.test(cleaned)) {
                const stripped = cleaned.replace(pat, '');
                if (stripped.length >= 3) {
                    forms.push(stripped);
                }
            }
        }

        for (const form of forms) {
            // 1. Izafet joined with hyphen: sâni-i -> sanii, huzur-u -> huzuru
            let joined = form.replace(/-([iıuüeeya])(?:\s+|$)/gi, '$1 ');
            joined = joined.replace(/-([iıuüeeya])-/gi, '$1-');
            let jNorm = this.normalizeBase(joined).replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ').replace(/\s+/g, ' ').trim();
            if (jNorm) keys.add(jNorm);

            // 2. Izafet joined with space: sani i -> sanii, huzur u -> huzuru
            let spJoined = form.replace(/\b([a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎûÛ]+)\s+([iıuüeeya])\b/gi, '$1$2');
            let spNorm = this.normalizeBase(spJoined).replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ').replace(/\s+/g, ' ').trim();
            if (spNorm) keys.add(spNorm);

            // 3. User typing "iz" instead of "i": sani iz zülcelal -> sanii zulcelal
            let izJoined = form.replace(/\s+iz\s+/gi, 'i ');
            let izNorm = this.normalizeBase(izJoined).replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ').replace(/\s+/g, ' ').trim();
            if (izNorm) keys.add(izNorm);

            // 4. Standard spaced
            let spaced = this.normalizeBase(form).replace(/[.,;!?:"'“”(){}\[\]\-\/\\\\]/g, ' ').replace(/\s+/g, ' ').trim();
            if (spaced) keys.add(spaced);
        }

        return Array.from(keys);
    }

    // --- MAIN SEARCH: Flexible with Suffix Stripping & Izafet Normalization ---
    async searchFlexible(query: string): Promise<{ best: DictionaryEntry | null, candidates: DictionaryEntry[] }> {
        if (!this.initialized) await this.init();
        if (!this.db) return { best: null, candidates: [] };

        const searchKeys = this.getSearchKeys(query);
        if (searchKeys.length === 0) return { best: null, candidates: [] };

        console.log('[DictionaryDb] searchFlexible query:', query, 'keys:', searchKeys);

        try {
            // 1. Try exact match on all generated keys (using SQL IN)
            const placeholders = searchKeys.map(() => '?').join(',');
            const exactMatches = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE lower(word_plain) IN (${placeholders}) 
                 ORDER BY length(word_plain) ASC`,
                searchKeys
            );

            if (exactMatches && exactMatches.length > 0) {
                return {
                    best: exactMatches[0],
                    candidates: exactMatches.slice(1)
                };
            }

            // 2. If no exact match and query has multiple words, also search individual words
            const words = query.split(/\s+/).filter(w => w.length >= 3);
            let wordCandidates: DictionaryEntry[] = [];
            if (words.length > 1) {
                const subKeys: string[] = [];
                for (const w of words) {
                    subKeys.push(...this.getSearchKeys(w));
                }
                if (subKeys.length > 0) {
                    const subPh = subKeys.map(() => '?').join(',');
                    const wordMatches = await this.db.getAllAsync<DictionaryEntry>(
                        `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                         FROM dictionary 
                         WHERE lower(word_plain) IN (${subPh}) 
                         ORDER BY length(word_plain) ASC 
                         LIMIT 10`,
                        subKeys
                    );
                    if (wordMatches && wordMatches.length > 0) {
                        wordCandidates = wordMatches;
                    }
                }
            }

            // 3. Try prefix matches on the primary search key
            const primaryKey = searchKeys[0];
            const prefixMatches = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE word_plain LIKE ? 
                 ORDER BY length(word_plain) ASC 
                 LIMIT 20`,
                [`${primaryKey}%`]
            );

            // 4. If few prefix matches, try contains matches
            let containsMatches: DictionaryEntry[] = [];
            if (prefixMatches.length < 5) {
                containsMatches = await this.db.getAllAsync<DictionaryEntry>(
                    `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                     FROM dictionary 
                     WHERE word_plain LIKE ? AND word_plain NOT LIKE ?
                     ORDER BY length(word_plain) ASC 
                     LIMIT 20`,
                    [`%${primaryKey}%`, `${primaryKey}%`]
                );
            }

            // Combine all unique candidates
            const candidateMap = new Map<number, DictionaryEntry>();
            for (const item of [...wordCandidates, ...prefixMatches, ...containsMatches]) {
                if (!candidateMap.has(item.id)) {
                    candidateMap.set(item.id, item);
                }
            }

            const allCandidates = Array.from(candidateMap.values());
            return {
                best: wordCandidates.length === 1 ? wordCandidates[0] : null,
                candidates: allCandidates
            };
        } catch (error) {
            console.error("[DictionaryDb] Flexible search error:", error);
            return { best: null, candidates: [] };
        }
    }

    async searchDefinition(word: string): Promise<DictionaryEntry | null> {
        const { best, candidates } = await this.searchFlexible(word);
        return best || (candidates.length > 0 ? candidates[0] : null);
    }
}

export const dictionaryDb = new DictionaryDb();
