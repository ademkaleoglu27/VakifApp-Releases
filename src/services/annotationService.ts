import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface BookAnnotation {
    id: number;
    corpus: 'sozler' | 'rnk';
    book_id: string;
    page_number: number;
    line_number: number;
    tag_type: 'vurgu' | 'ayet' | 'baslik' | 'fihrist';
    raw_tag: string;
    clean_text: string;
    ref_id?: string | null;
}

const DB_NAME = 'book_annotations.db';

class AnnotationService {
    private db: SQLite.SQLiteDatabase | null = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.initialized && this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const dbDir = `${FileSystem.documentDirectory}SQLite`;
                const dirInfo = await FileSystem.getInfoAsync(dbDir);
                if (!dirInfo.exists) {
                    await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
                }

                const dbPath = `${dbDir}/${DB_NAME}`;
                const fileInfo = await FileSystem.getInfoAsync(dbPath);

                // Expected minimum size ~10MB
                const EXPECTED_MIN_SIZE = 10 * 1024 * 1024;
                if (!fileInfo.exists || !('size' in fileInfo) || (fileInfo as any).size < EXPECTED_MIN_SIZE) {
                    try {
                        const bundleUri = `${FileSystem.bundleDirectory}${DB_NAME}`;
                        console.log('[AnnotationService] Copying db from bundle:', bundleUri);
                        await FileSystem.copyAsync({ from: bundleUri, to: dbPath });
                    } catch (bundleErr) {
                        console.warn('[AnnotationService] Bundle copy error, trying asset:/ fallback:', bundleErr);
                        try {
                            await FileSystem.copyAsync({ from: `asset:/${DB_NAME}`, to: dbPath });
                        } catch (assetErr) {
                            console.warn('[AnnotationService] asset:/ fallback error:', assetErr);
                        }
                    }
                }

                this.db = await SQLite.openDatabaseAsync(DB_NAME);
                this.initialized = true;
                console.log('[AnnotationService] Database initialized successfully.');
            } catch (err) {
                console.error('[AnnotationService] Init error:', err);
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Get all annotations for a specific book and page
     */
    async getAnnotationsForPage(
        bookId: string,
        pageNumber: number,
        corpus?: 'sozler' | 'rnk'
    ): Promise<BookAnnotation[]> {
        await this.init();
        if (!this.db) return [];

        try {
            const cleanId = bookId.toLowerCase().replace(/^(soz_|rnk_)/, '').replace(/_0$/, '');
            let sql = 'SELECT * FROM book_annotations WHERE (book_id = ? OR book_id LIKE ?) AND page_number = ?';
            const params: any[] = [cleanId, `%${cleanId}%`, pageNumber];

            if (corpus) {
                sql += ' AND corpus = ?';
                params.push(corpus);
            }

            sql += ' ORDER BY line_number ASC';
            return await this.db.getAllAsync<BookAnnotation>(sql, params);
        } catch (e) {
            console.warn('[AnnotationService] getAnnotationsForPage error:', e);
            return [];
        }
    }

    /**
     * Search annotations across all books or within a specific corpus
     */
    async searchAnnotations(
        query: string,
        corpus?: 'sozler' | 'rnk',
        limit = 50
    ): Promise<BookAnnotation[]> {
        await this.init();
        if (!this.db || !query || query.trim().length < 2) return [];

        try {
            const searchTerm = `%${query.trim()}%`;
            let sql = 'SELECT * FROM book_annotations WHERE clean_text LIKE ?';
            const params: any[] = [searchTerm];

            if (corpus) {
                sql += ' AND corpus = ?';
                params.push(corpus);
            }

            sql += ' ORDER BY id ASC LIMIT ?';
            params.push(limit);

            return await this.db.getAllAsync<BookAnnotation>(sql, params);
        } catch (e) {
            console.warn('[AnnotationService] searchAnnotations error:', e);
            return [];
        }
    }

    /**
     * Get all ayahs with their meal reference IDs for a page
     */
    async getAyatForPage(bookId: string, pageNumber: number): Promise<BookAnnotation[]> {
        const all = await this.getAnnotationsForPage(bookId, pageNumber);
        return all.filter(a => a.tag_type === 'ayet');
    }

    /**
     * Get all emphasized words for a page
     */
    async getVurgularForPage(bookId: string, pageNumber: number): Promise<BookAnnotation[]> {
        const all = await this.getAnnotationsForPage(bookId, pageNumber);
        return all.filter(a => a.tag_type === 'vurgu');
    }

    /**
     * Get all chapter headings for a book
     */
    async getHeadingsForBook(bookId: string, corpus?: 'sozler' | 'rnk'): Promise<BookAnnotation[]> {
        await this.init();
        if (!this.db) return [];

        try {
            const cleanId = bookId.toLowerCase().replace(/^(soz_|rnk_)/, '').replace(/_0$/, '');
            let sql = 'SELECT * FROM book_annotations WHERE (book_id = ? OR book_id LIKE ?) AND tag_type = "baslik"';
            const params: any[] = [cleanId, `%${cleanId}%`];

            if (corpus) {
                sql += ' AND corpus = ?';
                params.push(corpus);
            }

            sql += ' ORDER BY page_number ASC, line_number ASC';
            return await this.db.getAllAsync<BookAnnotation>(sql, params);
        } catch (e) {
            console.warn('[AnnotationService] getHeadingsForBook error:', e);
            return [];
        }
    }
}

export const annotationService = new AnnotationService();
