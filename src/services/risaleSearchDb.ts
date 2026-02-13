import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { RisaleAssets } from './risaleAssets';
import { normalizeText } from './textNormalization';

const DB_NAME = 'risale_search_v2.db';

export interface SearchResult {
    book_id: string;
    book_title: string;
    page_number: number; // Mapping: page_number effectively usually maps to blockIndex / (avg blocks per page) or just blockIndex.
    // Ideally we return block_index to jump to specific block.
    block_index: number;
    snippet: string;
    type: string;
}

export const RisaleSearchDb = {
    db: null as SQLite.SQLiteDatabase | null,
    isIndexing: false,

    async init() {
        if (this.db) return;
        this.db = await SQLite.openDatabaseAsync(DB_NAME);

        await this.db.execAsync(`
            CREATE VIRTUAL TABLE IF NOT EXISTS risale_fts USING fts5(
                book_id UNINDEXED,
                book_title UNINDEXED,
                block_index UNINDEXED,
                type UNINDEXED,
                content,
                content_normalized,
                tokenize = 'unicode61 remove_diacritics 0'
            );
        `);

        // Check if we need to index
        const countRes = await this.db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM risale_fts');
        if (countRes && countRes.count === 0) {
            this.buildIndex();
        }
    },

    async buildIndex() {
        if (this.isIndexing || !this.db) return;
        this.isIndexing = true;
        console.log('Starting Search Indexing...');

        try {
            // Read Meta from assets
            // const metaPath = RisaleAssets.getJsonPath('risale.meta.json');
            // const metaStr = await FileSystem.readAsStringAsync(metaPath);
            // const meta = JSON.parse(metaStr);
            const meta: { books: string[] } = { books: [] };

            await this.db.execAsync('BEGIN TRANSACTION');

            // Disable JSON indexing for build safety.
            // TODO: Migrate to using DB FTS.
            console.log('[RisaleSearchDb] JSON Indexing Disabled for Build Safety.');
            /*
            for (const bookSlugg of meta.books) {
                // e.g. "sozler.json"
                try {
                    const bookPath = RisaleAssets.getJsonPath(bookSlugg);
                    const bookContentStr = await FileSystem.readAsStringAsync(bookPath);
                    const bookJson = JSON.parse(bookContentStr);

                    const slug = bookJson.meta.slug;
                    const title = bookJson.meta.title;
                    const blocks = bookJson.blocks;

                    const stmt = await this.db.prepareAsync(
                        'INSERT INTO risale_fts (book_id, book_title, block_index, type, content, content_normalized) VALUES (?, ?, ?, ?, ?, ?)'
                    );

                    for (let i = 0; i < blocks.length; i++) {
                        const block = blocks[i];
                        // Only index meaningful text
                        if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'note') {
                            const text = block.text;
                            if (text && text.length > 3 && text !== '***') {
                                const norm = normalizeText(text);
                                await stmt.executeAsync([slug, title, i, block.type, text, norm]);
                            }
                        }
                    }
                    await stmt.finalizeAsync();
                    console.log(`Indexed ${title}`);
                } catch (e) {
                    console.error(`Failed to index ${bookSlugg}`, e);
                }
            }
            */

            await this.db.execAsync('COMMIT');
            console.log('Search Indexing Complete.');
        } catch (error) {
            console.error('Indexing Error', error);
            await this.db.execAsync('ROLLBACK');
        } finally {
            this.isIndexing = false;
        }
    },

    async search(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        if (!this.db) await this.init();
        if (!this.db) throw new Error('DB init failed');

        const normalizedQuery = normalizeText(query);
        if (normalizedQuery.length < 2) return [];

        // FTS5 query
        // We match against content_normalized
        const ftsQuery = `"${normalizedQuery}"*`;

        const results = await this.db.getAllAsync<any>(
            `SELECT 
                book_id, 
                book_title, 
                block_index,
                type,
                snippet(risale_fts, 4, '<b>', '</b>', '...', 15) as snippet 
             FROM risale_fts 
             WHERE risale_fts MATCH ? 
             ORDER BY rank 
             LIMIT ? OFFSET ?`,
            [ftsQuery, limit, offset]
        );

        return results.map(r => ({
            book_id: r.book_id,
            book_title: r.book_title,
            // Approximating page number for UI (assuming ~5 blocks per page if real mapping missing)
            page_number: Math.floor(r.block_index / 5) + 1,
            block_index: r.block_index,
            type: r.type,
            snippet: r.snippet
        }));
    }
};
