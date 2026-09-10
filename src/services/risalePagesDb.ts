import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { canonicalizeBookId } from './bookId';
import { QuranMeta } from '@/features/quran/services/QuranMeta';

const DB_NAME = 'quran_mealler.db';

export interface BookInfo {
    id: string;
    publisher: 'sozler' | 'rnk';
    title: string;
    category: string;
    start_page: number;
    end_page: number;
    total_pages: number;
    order_index: number;
}

export interface PageBlock {
    type: 'heading' | 'subtitle' | 'heading_small' | 'arabic' | 'paragraph';
    text: string;
}

export interface PageData {
    book_id: string;
    page_number: number;
    chapter_title: string;
    blocks: PageBlock[];
    plain_text: string;
}

export interface FihristItem {
    id: number;
    book_id: string;
    title: string;
    page_number: number;
    level: number;
    order_index: number;
}

export interface SearchResult {
    book_id: string;
    page_number: number;
    chapter_title: string;
    snippet: string;
}

class RisalePagesDb {
    private db: SQLite.SQLiteDatabase | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;

    async init() {
        if (this.initialized && this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const dbDir = `${FileSystem.documentDirectory}SQLite`;
                if (!(await FileSystem.getInfoAsync(dbDir)).exists) {
                    await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
                }

                const dbPath = `${dbDir}/${DB_NAME}`;
                const fileInfo = await FileSystem.getInfoAsync(dbPath);

                // Expected minimum size is ~5 MB
                if (!fileInfo.exists || !('size' in fileInfo) || (fileInfo as any).size < 4 * 1024 * 1024) {
                    console.log('[RisalePagesDb] Copying quran_mealler.db to document directory...');
                    const bundleUri = `${FileSystem.bundleDirectory}${DB_NAME}`;
                    try {
                        console.log('[RisalePagesDb] Copying natively from asset bundle:', bundleUri);
                        await FileSystem.copyAsync({
                            from: bundleUri,
                            to: dbPath
                        });
                    } catch (bundleErr) {
                        console.warn('[RisalePagesDb] Bundle copy error:', bundleErr);
                    }
                }

                this.db = await SQLite.openDatabaseAsync(DB_NAME);
                this.initialized = true;
                console.log('[RisalePagesDb] Database initialized successfully.');
            } catch (error) {
                console.error('[RisalePagesDb] Failed to init database:', error);
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    async getBooks(): Promise<BookInfo[]> {
        if (!this.initialized) await this.init();
        if (!this.db) return [];

        try {
            return await this.db.getAllAsync<BookInfo>(
                `SELECT id, publisher, title, category, start_page, end_page, total_pages, order_index 
                 FROM books 
                 ORDER BY order_index ASC`
            );
        } catch (error) {
            console.error('[RisalePagesDb] getBooks error:', error);
            return [];
        }
    }

    async getBookById(bookId: string): Promise<BookInfo | null> {
        if (!this.initialized) await this.init();
        if (!this.db) return null;

        const canon = canonicalizeBookId(bookId) || bookId;
        try {
            return await this.db.getFirstAsync<BookInfo>(
                `SELECT id, publisher, title, category, start_page, end_page, total_pages, order_index 
                 FROM books 
                 WHERE id = ? OR id = ?`,
                [canon, bookId]
            );
        } catch (error) {
            console.error('[RisalePagesDb] getBookById error:', error);
            return null;
        }
    }

    async getPage(bookId: string, pageNumber: number): Promise<PageData | null> {
        if (!this.initialized) await this.init();
        if (!this.db) return null;

        const canon = canonicalizeBookId(bookId) || bookId;
        try {
            const row = await this.db.getFirstAsync<{
                book_id: string;
                page_number: number;
                chapter_title: string;
                blocks_json: string;
                plain_text: string;
            }>(
                `SELECT book_id, page_number, chapter_title, blocks_json, plain_text 
                 FROM pages 
                 WHERE (book_id = ? OR book_id = ?) AND page_number = ?`,
                [canon, bookId, pageNumber]
            );

            if (!row) return null;

            return {
                book_id: row.book_id,
                page_number: row.page_number,
                chapter_title: row.chapter_title,
                blocks: JSON.parse(row.blocks_json || '[]'),
                plain_text: row.plain_text
            };
        } catch (error) {
            console.error('[RisalePagesDb] getPage error:', error);
            return null;
        }
    }

    async getPagesBatch(bookId: string, startPage: number, endPage: number): Promise<Map<number, PageData>> {
        if (!this.initialized) await this.init();
        const map = new Map<number, PageData>();
        if (!this.db) return map;

        const canon = canonicalizeBookId(bookId) || bookId;
        try {
            const rows = await this.db.getAllAsync<{
                book_id: string;
                page_number: number;
                chapter_title: string;
                blocks_json: string;
                plain_text: string;
            }>(
                `SELECT book_id, page_number, chapter_title, blocks_json, plain_text 
                 FROM pages 
                 WHERE (book_id = ? OR book_id = ?) AND page_number >= ? AND page_number <= ? 
                 ORDER BY page_number ASC`,
                [canon, bookId, startPage, endPage]
            );

            for (const r of rows) {
                map.set(r.page_number, {
                    book_id: r.book_id,
                    page_number: r.page_number,
                    chapter_title: r.chapter_title,
                    blocks: JSON.parse(r.blocks_json || '[]'),
                    plain_text: r.plain_text
                });
            }
            return map;
        } catch (error) {
            console.error('[RisalePagesDb] getPagesBatch error:', error);
            return map;
        }
    }

    async getFihrist(bookId: string): Promise<FihristItem[]> {
        if (!this.initialized) await this.init();
        if (!this.db) return [];

        const canon = canonicalizeBookId(bookId) || bookId;
        try {
            return await this.db.getAllAsync<FihristItem>(
                `SELECT id, book_id, title, page_number, level, order_index 
                 FROM fihrist 
                 WHERE book_id = ? OR book_id = ?
                 ORDER BY order_index ASC`,
                [canon, bookId]
            );
        } catch (error) {
            console.error('[RisalePagesDb] getFihrist error:', error);
            return [];
        }
    }

    async search(query: string, limit: number = 50): Promise<SearchResult[]> {
        if (!this.initialized) await this.init();
        if (!this.db) return [];

        const cleanQuery = query.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/gi, '').trim();
        if (!cleanQuery) return [];

        try {
            return await this.db.getAllAsync<SearchResult>(
                `SELECT book_id, page_number, chapter_title, 
                        snippet(pages_fts, 3, '<b>', '</b>', '...', 12) as snippet 
                 FROM pages_fts 
                 WHERE pages_fts MATCH ? 
                 ORDER BY rank 
                 LIMIT ?`,
                [cleanQuery, limit]
            );
        } catch (error) {
            console.error('[RisalePagesDb] search error:', error);
            return [];
        }
    }

    private async lookupSingleAyetMeal(arabicText: string): Promise<AyetMeal | null> {
        if (!this.db || !arabicText) return null;

        // Robust Arabic cleaning:
        // 1. Preserve asterisks for multi-phrase annotations, strip non-Arabic punctuation
        // 2. Strip diacritics / harakat (U+064B-U+065F, U+0670, U+06D6-U+06ED)
        // 3. Normalize alef forms, yaa, taa marbuta
        const cleanWithStar = arabicText
            .replace(/[^\u0621-\u064A\u0671-\u06D3*]/g, '')
            .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
            .replace(/[إأآٱ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه');

        const cleanNoStar = cleanWithStar.replace(/\*/g, '');

        if (!cleanNoStar || cleanNoStar.length < 3) return null;
        const prefix = cleanNoStar.slice(0, 20);

        try {
            // 1. Check ayet_mealler (Risale-i Nur specialized translation and annotations)
            const risaleMeal = await this.db.getFirstAsync<AyetMeal>(
                `SELECT arabic_text, meal_tr, source_ref 
                 FROM ayet_mealler 
                 WHERE (
                     clean_arabic = ? 
                     OR clean_arabic = ?
                     OR (? LIKE clean_arabic || '%' AND LENGTH(clean_arabic) >= 8) 
                     OR (? LIKE clean_arabic || '%' AND LENGTH(clean_arabic) >= 8) 
                     OR (clean_arabic LIKE ? || '%' AND LENGTH(clean_arabic) >= 8)
                     OR (clean_arabic LIKE '%' || ? || '%' AND LENGTH(clean_arabic) >= 8)
                 )
                 AND meal_tr NOT IN ('mm', 'x')
                 AND LENGTH(TRIM(meal_tr)) > 5
                 ORDER BY LENGTH(clean_arabic) DESC
                 LIMIT 1`,
                [cleanWithStar, cleanNoStar, cleanWithStar, cleanNoStar, prefix, prefix]
            );

            if (risaleMeal && risaleMeal.meal_tr) {
                return {
                    arabic_text: risaleMeal.arabic_text || arabicText,
                    meal_tr: risaleMeal.meal_tr,
                    source_ref: (risaleMeal.source_ref && risaleMeal.source_ref.trim().length > 0)
                        ? risaleMeal.source_ref.trim()
                        : 'Risale-i Nur Meâli'
                };
            }

            // 2. Fallback: Search all 6,236 Quran verses from quran_ayahs table
            const quranAyah = await this.db.getFirstAsync<{
                surah_id: number;
                ayah_number: number;
                text_ar: string;
                text_tr: string;
            }>(
                `SELECT surah_id, ayah_number, text_ar, text_tr 
                 FROM quran_ayahs 
                 WHERE clean_arabic LIKE ? || '%' 
                    OR clean_arabic LIKE '%' || ? || '%'
                    OR clean_arabic LIKE '%' || ? || '%'
                 LIMIT 1`,
                [prefix, cleanNoStar, prefix]
            );

            if (quranAyah) {
                const surahName = QuranMeta.getSurahName(quranAyah.surah_id);
                return {
                    arabic_text: quranAyah.text_ar,
                    meal_tr: quranAyah.text_tr,
                    source_ref: `${surahName} (${quranAyah.surah_id}:${quranAyah.ayah_number})`
                };
            }

            return null;
        } catch (error) {
            console.error('[RisalePagesDb] lookupSingleAyetMeal error:', error);
            return null;
        }
    }

    async getAyetMeal(arabicText: string): Promise<AyetMeal | null> {
        if (!this.initialized) await this.init();
        if (!this.db || !arabicText) return null;

        // 1. Try single lookup on full block first
        const direct = await this.lookupSingleAyetMeal(arabicText);
        if (direct) return direct;

        // 2. If no direct match and block contains segment delimiters, try segmented lookup
        if (/[۞*۝\n]+/.test(arabicText)) {
            const segments = arabicText
                .split(/[۞*۝\n]+/)
                .map(s => s.trim())
                .filter(s => s.length >= 8);

            if (segments.length > 1) {
                const foundMeals: string[] = [];
                const foundSources: string[] = [];
                const foundArabics: string[] = [];

                for (const seg of segments) {
                    const m = await this.lookupSingleAyetMeal(seg);
                    if (m && m.meal_tr) {
                        foundMeals.push(m.meal_tr.trim());
                        if (m.source_ref && !foundSources.includes(m.source_ref)) {
                            foundSources.push(m.source_ref);
                        }
                        if (m.arabic_text) {
                            foundArabics.push(m.arabic_text.trim());
                        }
                    }
                }

                if (foundMeals.length > 0) {
                    return {
                        arabic_text: foundArabics.length > 0 ? foundArabics.join(' ۞ ') : arabicText,
                        meal_tr: foundMeals.join('\n\n* * *\n\n'),
                        source_ref: foundSources.length > 0 ? foundSources.join(' | ') : 'Risale-i Nur Meâli'
                    };
                }
            }
        }

        return null;
    }

    async getQuranAyahs(surahId: number): Promise<QuranAyahEntry[]> {
        if (!this.initialized) await this.init();
        if (!this.db) return [];
        try {
            return await this.db.getAllAsync<QuranAyahEntry>(
                `SELECT id, surah_id, ayah_number, page_number, juz_number, text_ar, text_tr, transcription_tr
                 FROM quran_ayahs
                 WHERE surah_id = ?
                 ORDER BY ayah_number ASC`,
                [surahId]
            );
        } catch (error) {
            console.error('[RisalePagesDb] getQuranAyahs error:', error);
            return [];
        }
    }
}

export interface AyetMeal {
    arabic_text: string;
    meal_tr: string;
    source_ref: string;
}

export interface QuranAyahEntry {
    id: number;
    surah_id: number;
    ayah_number: number;
    page_number: number;
    juz_number: number;
    text_ar: string;
    text_tr: string;
    transcription_tr?: string;
}

export const risalePagesDb = new RisalePagesDb();

