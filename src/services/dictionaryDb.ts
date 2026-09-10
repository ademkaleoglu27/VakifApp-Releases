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

        // Normalize all accented/diacritic vowels to base ASCII
        s = s.replace(/[àáâãäåāǎ]/g, 'a')
             .replace(/[èéêëē]/g, 'e')
             .replace(/[ìíîïī]/g, 'i')
             .replace(/[òóôõöō]/g, 'o')
             .replace(/[ùúûüū]/g, 'u')
             .replace(/[\u0300-\u036f]/g, '');

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
        // e.g., Sâni'-i Zülcelâl'in -> Sâni'-i Zülcelâl, Rahmân'a -> Rahmân, Güneş'in -> Güneş, Müstağnî-i Ale'l-Itlâk'ın -> Müstağnî-i Ale'l-Itlâk
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

        // Comprehensive attached suffixes without apostrophe
        const attachedSuffixes = [
            /(?:lerinin|larının|lerinden|larından|lerine|larına|leriyle|larıyla)$/i,
            /(?:lerimiz|larımız|lerimizi|larımızı|lerimize|larımıza|lerimizde|larımızda)$/i,
            /(?:lar|ler)(?:ın|in|un|ün|ı|i|u|ü|a|e|da|de|dan|den)?$/i,
            /(?:ını|ini|unu|ünü|nı|ni|nu|nü)$/i,
            /(?:ında|inde|unda|ünde|nda|nde)$/i,
            /(?:ından|inden|undan|ünden|ndan|nden)$/i,
            /(?:ına|ine|una|üne|na|ne)$/i,
            /(?:ıyla|iyle|uyla|üyle|yla|yle)$/i,
            /(?:ımız|imiz|umuz|ümüz|mız|miz|muz|müz)$/i,
            /(?:ınız|iniz|unuz|ünüz)$/i,
            /(?:nın|nin|nun|nün)$/i,
            /(?:dan|den|tan|ten)$/i,
            /(?:da|de|ta|te)$/i,
            /(?:ya|ye)$/i,
            /(?:yı|yi|yu|yü)$/i,
            /(?:sı|si|su|sü)$/i,
            /(?:ın|in|un|ün)$/i,
            /(?:ım|im|um|üm)$/i,
            /(?<=[aeıioöuüâîûàèìù])m$/i,
            /(?<=[aeıioöuüâîûàèìù])n$/i,
            /(?:ı|i|u|ü)$/i,
        ];

        const stripSuffix = (w: string) => {
            for (const pat of attachedSuffixes) {
                if (pat.test(w)) {
                    const stripped = w.replace(pat, '');
                    if (stripped.length >= 3) return stripped;
                }
            }
            return w;
        };

        const rawForms = [cleaned];

        // If compound, also strip suffix from the last component:
        // e.g. "Harekât-ı sâbıkam" -> "Harekât-ı sâbıka", "lemeât-ı bekàiyenin" -> "lemeât-ı bekàiye"
        const parts = cleaned.split(/(\s+|-)/);
        if (parts.length > 1) {
            const lastWord = parts[parts.length - 1];
            const strippedLast = stripSuffix(lastWord);
            if (strippedLast !== lastWord) {
                const compoundStripped = parts.slice(0, parts.length - 1).join('') + strippedLast;
                rawForms.push(compoundStripped);
            }
        } else {
            const singleStripped = stripSuffix(cleaned);
            if (singleStripped !== cleaned) rawForms.push(singleStripped);
        }

        for (const form of rawForms) {
            // Form in lowercase with Turkish locale + normalize accents to base vowels
            const trLower = form.toLocaleLowerCase('tr-TR')
                .replace(/[àáâãäåāǎ]/g, 'a')
                .replace(/[èéêëē]/g, 'e')
                .replace(/[ìíîïī]/g, 'i')
                .replace(/[òóôõöō]/g, 'o')
                .replace(/[ùúûüū]/g, 'u')
                .replace(/[\u0300-\u036f]/g, '');

            keys.add(trLower);

            // Strip circumflex: â->a, î->i, û->u, ô->o, ê->e
            const noCirc = trLower.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/ô/g, 'o').replace(/ê/g, 'e');
            keys.add(noCirc);

            // Arabic prefix merges (ale'l- -> alel, bi'l- -> bil, fi'l- -> fil, li'l- -> lil)
            const arabicMergeTr = trLower
                .replace(/ale['’]l[- ]+/gi, 'alel')
                .replace(/bi['’]l[- ]+/gi, 'bil')
                .replace(/fi['’]l[- ]+/gi, 'fil')
                .replace(/li['’]l[- ]+/gi, 'lil');
            const arabicMergeNoCirc = noCirc
                .replace(/ale['’]l[- ]+/gi, 'alel')
                .replace(/bi['’]l[- ]+/gi, 'bil')
                .replace(/fi['’]l[- ]+/gi, 'fil')
                .replace(/li['’]l[- ]+/gi, 'lil');

            [trLower, noCirc, arabicMergeTr, arabicMergeNoCirc].forEach(base => {
                keys.add(base);
                // Turkish izafet hyphen handling: kelâm-ı -> kelamı (with dotless ı)
                keys.add(base.replace(/-([iıuüeeya])(?:\s+|$)/gi, '$1 '));
                // Izafet joined without space: semere-i -> semerei, sâni-i -> sanii
                keys.add(base.replace(/-([iıuüeeya])(?:\s+|$)/gi, '$1'));
                // Izafet yi/yı variant: müstağnî-i -> mustagniyi
                keys.add(base.replace(/-i(?:\s+|$)/gi, 'yi '));
                keys.add(base.replace(/-ı(?:\s+|$)/gi, 'yı '));
                keys.add(base.replace(/-i(?:\s+|$)/gi, 'yi'));
                keys.add(base.replace(/-ı(?:\s+|$)/gi, 'yı'));
                // Replace hyphen with space
                keys.add(base.replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim());
                // Remove hyphen directly
                keys.add(base.replace(/[-]/g, '').replace(/\s+/g, ' ').trim());
                // Apostrophe variants removed (e.g. sâni' -> sani)
                const noApos = base.replace(/[’'ʿʾ`]/g, '');
                keys.add(noApos);
                keys.add(noApos.replace(/-([iıuüeeya])(?:\s+|$)/gi, '$1 ').replace(/\s+/g, ' ').trim());
                keys.add(noApos.replace(/-([iıuüeeya])(?:\s+|$)/gi, '$1').replace(/\s+/g, ' ').trim());
                keys.add(noApos.replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim());
                keys.add(noApos.replace(/[-]/g, '').replace(/\s+/g, ' ').trim());
            });

            // Generate both Turkish-character versions (preserving dotless ı) AND full ASCII normalized versions
            const currentKeys = Array.from(keys);
            for (const k of currentKeys) {
                // Version keeping dotless ı but converting ğ, ş, ç, ö, ü
                const trPlain = k
                    .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
                    .replace(/[’'ʿʾ`]/g, '');
                keys.add(trPlain);
                keys.add(trPlain.replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim());
                keys.add(trPlain.replace(/[-]/g, '').replace(/\s+/g, ' ').trim());

                // Version with ı -> i
                const asciiPlain = trPlain.replace(/ı/g, 'i');
                keys.add(asciiPlain);
                keys.add(asciiPlain.replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim());
                keys.add(asciiPlain.replace(/[-]/g, '').replace(/\s+/g, ' ').trim());
            }
        }

        return Array.from(keys).filter(k => k.length > 0);
    }

    // --- MAIN SEARCH: Flexible with Suffix Stripping & Izafet Normalization ---
    async searchFlexible(query: string): Promise<{ best: DictionaryEntry | null, candidates: DictionaryEntry[] }> {
        if (!this.initialized) await this.init();
        if (!this.db) return { best: null, candidates: [] };

        const searchKeys = this.getSearchKeys(query);
        if (searchKeys.length === 0) return { best: null, candidates: [] };

        console.log('[DictionaryDb] searchFlexible query:', query, 'keys count:', searchKeys.length);

        try {
            // 1. Try exact match on all generated keys (checking both word_plain AND word)
            const placeholders = searchKeys.map(() => '?').join(',');
            const exactMatches = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE lower(word_plain) IN (${placeholders}) 
                    OR lower(word) IN (${placeholders})
                 ORDER BY length(word_plain) ASC`,
                [...searchKeys, ...searchKeys]
            );

            if (exactMatches && exactMatches.length > 0) {
                // Prioritize entries that match the query's initial character without diacritic downgrade (e.g. Ş vs S)
                const qLowerTr = query.toLocaleLowerCase('tr-TR');
                const sortedExact = [...exactMatches].sort((a, b) => {
                    const aOsm = (a.word_osm || '').toLocaleLowerCase('tr-TR');
                    const bOsm = (b.word_osm || '').toLocaleLowerCase('tr-TR');
                    const aTr = (a.word_tr || '').toLocaleLowerCase('tr-TR');
                    const bTr = (b.word_tr || '').toLocaleLowerCase('tr-TR');

                    const aExact = (aOsm.startsWith(qLowerTr.slice(0, 2)) || aTr.startsWith(qLowerTr.slice(0, 2))) ? 1 : 0;
                    const bExact = (bOsm.startsWith(qLowerTr.slice(0, 2)) || bTr.startsWith(qLowerTr.slice(0, 2))) ? 1 : 0;
                    return bExact - aExact;
                });

                // Deduplicate by word_plain to keep results tidy
                const seen = new Set<string>();
                const uniqueExact: DictionaryEntry[] = [];
                for (const em of sortedExact) {
                    const key = (em.word_tr || '').toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueExact.push(em);
                    }
                }
                return {
                    best: uniqueExact[0],
                    candidates: uniqueExact.slice(1)
                };
            }

            // 2. If no exact match and query is a compound phrase (contains space or hyphen),
            // try a compound prefix/phrase search before splitting into isolated words!
            const isCompound = /[\s\-]/.test(query);
            if (isCompound) {
                const primaryKey = searchKeys[0];
                const cleanKey = primaryKey.replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim();
                const compoundMatches = await this.db.getAllAsync<DictionaryEntry>(
                    `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                     FROM dictionary 
                     WHERE word_plain LIKE ? OR word LIKE ? 
                        OR word_plain LIKE ? OR word LIKE ?
                     ORDER BY length(word_plain) ASC 
                     LIMIT 15`,
                    [`${primaryKey}%`, `${primaryKey}%`, `${cleanKey}%`, `${cleanKey}%`]
                );

                if (compoundMatches && compoundMatches.length > 0) {
                    const seen = new Set<string>();
                    const uniqueCompound: DictionaryEntry[] = [];
                    for (const cm of compoundMatches) {
                        const key = (cm.word_tr || '').toLowerCase();
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueCompound.push(cm);
                        }
                    }
                    if (uniqueCompound.length > 0) {
                        return {
                            best: uniqueCompound[0],
                            candidates: uniqueCompound.slice(1)
                        };
                    }
                }
            }

            // 3. Sub-word fallback for compound phrases where the phrase itself is not in dictionary
            const noiseWords = new Set(['ve', 'ile', 'ise', 'bir', 'o', 'bu', 'şu', 'de', 'da', 'ki', 'ale', 'alel', 'bi', 'bil', 'fi', 'fil', 'li', 'lil']);
            // If query contains ale'l-X, bi'l-X, etc., also add the merged token (e.g. alel-ıtlak -> alelıtlak)
            const normalizedQuery = query
                .replace(/ale['’]l[- ]+/gi, 'alel')
                .replace(/bi['’]l[- ]+/gi, 'bil')
                .replace(/fi['’]l[- ]+/gi, 'fil');

            const words = normalizedQuery.split(/[\s\-']+/).filter(w => w.length >= 3 && !noiseWords.has(w.toLowerCase()));
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
                            OR lower(word) IN (${subPh})
                         ORDER BY length(word_plain) ASC 
                         LIMIT 15`,
                        [...subKeys, ...subKeys]
                    );
                    if (wordMatches && wordMatches.length > 0) {
                        wordCandidates = wordMatches;
                    }
                }
            }

            // 4. Prefix matches on the primary search key
            const primaryKey = searchKeys[0];
            const prefixMatches = await this.db.getAllAsync<DictionaryEntry>(
                `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                 FROM dictionary 
                 WHERE word_plain LIKE ? OR word LIKE ?
                 ORDER BY length(word_plain) ASC 
                 LIMIT 20`,
                [`${primaryKey}%`, `${primaryKey}%`]
            );

            // 5. If few prefix matches, try contains matches
            let containsMatches: DictionaryEntry[] = [];
            if (prefixMatches.length < 5) {
                containsMatches = await this.db.getAllAsync<DictionaryEntry>(
                    `SELECT rowid as id, word as word_osm, word_plain as word_tr, definition 
                     FROM dictionary 
                     WHERE (word_plain LIKE ? OR word LIKE ?) 
                       AND word_plain NOT LIKE ?
                     ORDER BY length(word_plain) ASC 
                     LIMIT 20`,
                    [`%${primaryKey}%`, `%${primaryKey}%`, `${primaryKey}%`]
                );
            }

            // Combine all unique candidates by word_plain (avoiding duplicate KELÂM / kelam)
            const seenWords = new Set<string>();
            const allCandidates: DictionaryEntry[] = [];
            for (const item of [...wordCandidates, ...prefixMatches, ...containsMatches]) {
                const normWord = (item.word_tr || '').toLowerCase().trim();
                if (!seenWords.has(normWord)) {
                    seenWords.add(normWord);
                    allCandidates.push(item);
                }
            }

            return {
                best: allCandidates.length === 1 ? allCandidates[0] : null,
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
