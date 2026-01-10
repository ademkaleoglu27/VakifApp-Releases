import { ReaderDatabase } from '../../services/ReaderDatabase';

export interface SearchResult {
    bookId: string;
    sectionId: string;
    segmentId: string;
    snippet: string;
}

export const SearchService = {
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

    async SEARCH_TEXT(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        const db = ReaderDatabase.getDb();
        const sanitized = this.sanitizeQuery(query);
        // fts_text columns: bookId(0), sectionId(1), segmentId(2), text(3)
        // snippet index 3 points to text column
        const results = await db.getAllAsync<any>(
            `SELECT bookId, sectionId, segmentId, snippet(fts_text, 3, '<b>', '</b>', '...', 15) as snippet 
             FROM fts_text 
             WHERE fts_text MATCH ? 
             ORDER BY bm25(fts_text)
             LIMIT ? OFFSET ?`,
            [sanitized, limit, offset]
        );
        return results;
    },

    async SEARCH_VECIZE(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
        const db = ReaderDatabase.getDb();
        const sanitized = this.sanitizeQuery(query);
        // fts_vecize columns: vecizeId(0), text(1), ...
        // snippet index 1 points to text
        const results = await db.getAllAsync<any>(
            `SELECT sourceBookId as bookId, sourceSectionId as sectionId, sourceSegmentId as segmentId, snippet(fts_vecize, 1, '<b>', '</b>', '...', 15) as snippet 
             FROM fts_vecize 
             WHERE fts_vecize MATCH ? 
             ORDER BY bm25(fts_vecize)
             LIMIT ? OFFSET ?`,
            [sanitized, limit, offset]
        );
        return results;
    },

    sanitizeQuery(query: string) {
        // 1. Remove non-alphanumeric chars (keep spaces and Turkish chars)
        // 2. Split by space
        // 3. Append * to each word for prefix search
        // 4. Join with spaces (implicit AND in FTS5 standard tokenizer, or use explicit AND)

        const clean = query.replace(/[^\w\s\u00C0-\u017F]/g, '').trim();
        if (!clean) return '""';

        const words = clean.split(/\s+/);
        const ftsQuery = words.map(w => `"${w}"*`).join(' AND ');

        return ftsQuery;
    }
};
