import { ReaderDatabase } from './ReaderDatabase';
import { getDb as getContentDb } from './contentDb';

export interface SearchResult {
    bookId: string;
    sectionId: string;
    segmentId: string;
    snippet: string;
}

// Debug diagnostics for search (DEV only)
async function logSearchDiagnostics(db: any, query: string, source: string) {
    if (!__DEV__) return;

    console.log(`[SearchService] ═════════════════════════════════════`);
    console.log(`[SearchService] Query Diagnostics for: "${query}" (${source})`);

    try {
        // 1. Total row count
        const tableName = source === 'fts' ? 'fts_text' : 'paragraphs';
        const totalRows = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM ${tableName}`);
        console.log(`[SearchService] Total ${tableName} rows: ${totalRows?.c || 0}`);

        // 2. LIKE count
        const likeField = source === 'fts' ? 'text' : 'text';
        const likeCount = await db.getFirstAsync<{ c: number }>(
            `SELECT COUNT(*) as c FROM ${tableName} WHERE ${likeField} LIKE ?`,
            [`%${query}%`]
        );
        console.log(`[SearchService] LIKE '%${query}%': ${likeCount?.c || 0} rows`);

        // 3. Sample rows (first 2)
        if ((likeCount?.c || 0) > 0) {
            const samples = await db.getAllAsync<any>(
                `SELECT section_id, substr(text, 1, 80) as preview FROM ${tableName} WHERE ${likeField} LIKE ? LIMIT 2`,
                [`%${query}%`]
            );
            console.log('[SearchService] Sample matches:');
            samples.forEach((s: any, i: number) => {
                console.log(`  [${i + 1}] ${s.section_id} → "${s.preview}..."`);
            });
        }
    } catch (e: any) {
        console.log('[SearchService] Diagnostic error:', e.message);
    }

    console.log(`[SearchService] ═════════════════════════════════════`);
}

export const SearchService = {
    /**
     * Search in FTS titles (reader_v3.db)
     */
    async SEARCH_TITLES(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        const db = ReaderDatabase.getDb();
        const sanitized = this.sanitizeQuery(query);
        const results = await db.getAllAsync<any>(
            `SELECT bookId, sectionId, segmentId, snippet(fts_titles, 3, '<b>', '</b>', '...', 10) as snippet 
             FROM fts_titles 
             WHERE fts_titles MATCH ? 
             ORDER BY bm25(fts_titles) 
             LIMIT ? OFFSET ?`,
            [sanitized, limit, offset]
        );
        return results;
    },

    /**
     * Search in FTS text content (reader_v3.db) - used for downloaded packs
     */
    async SEARCH_TEXT(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        const db = ReaderDatabase.getDb();

        // Run diagnostics in DEV
        if (__DEV__) {
            await logSearchDiagnostics(db, query, 'fts');
        }

        const sanitized = this.sanitizeQuery(query);

        if (__DEV__) {
            console.log('[SearchService.SEARCH_TEXT] FTS query:', sanitized);
        }

        try {
            const results = await db.getAllAsync<any>(
                `SELECT bookId, sectionId, segmentId, snippet(fts_text, 3, '<b>', '</b>', '...', 15) as snippet 
                 FROM fts_text 
                 WHERE fts_text MATCH ? 
                 ORDER BY bm25(fts_text)
                 LIMIT ? OFFSET ?`,
                [sanitized, limit, offset]
            );
            return results;
        } catch (e: any) {
            if (__DEV__) {
                console.log('[SearchService.SEARCH_TEXT] FTS error:', e.message);
            }
            return [];
        }
    },

    /**
     * Search in bundled content (risale_v3.db paragraphs table)
     * This is the PRIMARY search for bundled Risale content.
     */
    async SEARCH_BUNDLED_CONTENT(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        try {
            const db = getContentDb();

            // Run diagnostics in DEV
            if (__DEV__) {
                await logSearchDiagnostics(db, query, 'bundled');
            }

            const cleanQuery = query.trim();
            if (!cleanQuery || cleanQuery.length < 2) return [];

            // Search paragraphs table using LIKE (bundled DB doesn't have FTS5)
            const results = await db.getAllAsync<any>(
                `SELECT 
                    s.book_id as bookId,
                    p.section_id as sectionId,
                    p.id as segmentId,
                    substr(p.text, MAX(1, instr(lower(p.text), lower(?)) - 30), 100) as snippet
                 FROM paragraphs p
                 JOIN sections s ON p.section_id = s.id
                 WHERE p.text LIKE ?
                 ORDER BY p.order_index ASC
                 LIMIT ? OFFSET ?`,
                [cleanQuery, `%${cleanQuery}%`, limit, offset]
            );

            if (__DEV__) {
                console.log(`[SearchService.SEARCH_BUNDLED_CONTENT] Found ${results.length} results for "${cleanQuery}"`);
            }

            return results.map(r => ({
                bookId: r.bookId || 'unknown',
                sectionId: r.sectionId || '',
                segmentId: r.segmentId || '',
                snippet: r.snippet || ''
            }));
        } catch (e: any) {
            if (__DEV__) {
                console.error('[SearchService.SEARCH_BUNDLED_CONTENT] Error:', e.message);
            }
            return [];
        }
    },

    /**
     * Hybrid search: Try bundled content first, then FTS for downloaded packs
     */
    async SEARCH_ALL(query: string, limit: number = 20): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        // 1. Search bundled content (primary)
        try {
            const bundledResults = await this.SEARCH_BUNDLED_CONTENT(query, limit);
            results.push(...bundledResults);
        } catch (e) {
            if (__DEV__) console.log('[SearchService.SEARCH_ALL] Bundled search failed:', e);
        }

        // 2. Search FTS for downloaded content packs (if any)
        try {
            const ftsResults = await this.SEARCH_TEXT(query, limit - results.length);
            // Dedupe by sectionId
            const existingSectionIds = new Set(results.map(r => r.sectionId));
            for (const r of ftsResults) {
                if (!existingSectionIds.has(r.sectionId)) {
                    results.push(r);
                    existingSectionIds.add(r.sectionId);
                }
            }
        } catch (e) {
            if (__DEV__) console.log('[SearchService.SEARCH_ALL] FTS search failed:', e);
        }

        return results.slice(0, limit);
    },

    async SEARCH_VECIZE(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        const db = ReaderDatabase.getDb();
        const sanitized = this.sanitizeQuery(query);
        try {
            const results = await db.getAllAsync<any>(
                `SELECT sourceBookId as bookId, sourceSectionId as sectionId, sourceSegmentId as segmentId, snippet(fts_vecize, 1, '<b>', '</b>', '...', 15) as snippet 
                 FROM fts_vecize 
                 WHERE fts_vecize MATCH ? 
                 ORDER BY bm25(fts_vecize)
                 LIMIT ? OFFSET ?`,
                [sanitized, limit, offset]
            );
            return results;
        } catch (e) {
            return [];
        }
    },

    /**
     * Sanitizes query for FTS5 MATCH syntax.
     * 
     * IMPORTANT: Uses Unicode-aware approach to preserve Turkish characters.
     */
    sanitizeQuery(query: string) {
        // 1. Keep letters (including Turkish), numbers, spaces, hyphens
        //    Remove dangerous FTS5 operators: + - * " ( ) { } [ ] ^ ~
        const clean = query
            .replace(/[+\-*"(){}[\]^~:]/g, ' ')  // Remove FTS operators
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim();

        if (!clean) return '""';

        // 2. Split by space
        const words = clean.split(/\s+/).filter(w => w.length > 0);

        if (words.length === 0) return '""';

        // 3. Build FTS query with prefix matching
        const ftsQuery = words.map(w => `"${w}"*`).join(' AND ');

        if (__DEV__) {
            console.log('[SearchService.sanitizeQuery]', {
                input: query,
                clean,
                words,
                ftsQuery
            });
        }

        return ftsQuery;
    }
};
