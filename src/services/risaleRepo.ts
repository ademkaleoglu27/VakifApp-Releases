import { getDb } from './contentDb';

// ════════════════════════════════════════════════════════════════
// LOAD & STABILIZE MODE
// Set to true to only show Sözler (first 5 sections)
// ════════════════════════════════════════════════════════════════
const LOAD_STABILIZE_MODE = true;
const ALLOWED_WORK_IDS = ['sozler']; // Only Sözler
const MAX_SECTIONS = 5; // Birinci-Beşinci Söz

export interface RisaleWork {
    id: string;
    title: string;
    category: string;
    order_no: number;
}

export interface RisaleSection {
    id: string;
    work_id: string;
    title: string;
    order_no: number;
}

export interface RisaleChunk {
    id: number;
    section_id: string;
    chunk_no: number;
    text_tr: string;
    page_no?: number;
}

export interface RisaleSearchResult {
    sectionId: string;
    sectionTitle: string;
    workId: string;
    workTitle: string;
    chunkIndex: number;
    snippet: string;
}

export const getChunksBySection = async (sectionId: string): Promise<RisaleChunk[]> => {
    const db = getDb();
    const results = await db.getAllAsync<any>(
        'SELECT * FROM paragraphs WHERE section_id = ? ORDER BY order_index ASC',
        [sectionId]
    );
    if (results && results.length > 0) {
        console.log("DEBUG RAW DB ROW:", JSON.stringify(results[0], null, 2));
    }
    return results.map(r => ({
        id: r.order_index,
        section_id: r.section_id,
        chunk_no: r.order_index,
        text_tr: r.text,
        page_no: r.page_no || 0
    }));
};

export const getSectionById = async (sectionId: string): Promise<RisaleSection | null> => {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM sections WHERE id = ?', [sectionId]);
    if (!r) return null;
    return {
        id: r.id,
        work_id: r.work_id,
        title: r.title,
        order_no: r.order_index
    };
};

export const getSectionsByWork = async (workId: string): Promise<RisaleSection[]> => {
    const db = getDb();

    // LOAD_STABILIZE_MODE: Limit to first 5 sections
    const limit = LOAD_STABILIZE_MODE ? MAX_SECTIONS : 999;

    const results = await db.getAllAsync<any>(
        'SELECT * FROM sections WHERE work_id = ? ORDER BY order_index ASC LIMIT ?',
        [workId, limit]
    );
    return results.map(r => ({
        id: r.id,
        work_id: r.work_id,
        title: r.title,
        order_no: r.order_index
    }));
};

export const getAllWorks = async (): Promise<RisaleWork[]> => {
    const db = getDb();

    let query = 'SELECT * FROM works';
    let params: any[] = [];

    // LOAD_STABILIZE_MODE: Only show Sözler
    if (LOAD_STABILIZE_MODE && ALLOWED_WORK_IDS.length > 0) {
        const placeholders = ALLOWED_WORK_IDS.map(() => '?').join(',');
        query += ` WHERE id IN (${placeholders})`;
        params = ALLOWED_WORK_IDS;
    }

    query += ' ORDER BY order_index ASC';

    const results = await db.getAllAsync<any>(query, params);
    return results.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category || '',
        order_no: r.order_index
    }));
};

/**
 * Search paragraphs in content DB for full-text search.
 * Returns results with sectionId for direct navigation.
 * Respects LOAD_STABILIZE_MODE filter.
 */
export const searchParagraphs = async (query: string, limit: number = 20): Promise<RisaleSearchResult[]> => {
    if (!query || query.length < 2) return [];

    const db = getDb();
    const searchPattern = `%${query}%`;

    // Build query with LOAD_STABILIZE_MODE filtering
    let sql = `
        SELECT 
            p.section_id,
            p.order_index as chunk_index,
            p.text as snippet,
            s.title as section_title,
            s.order_index as section_order,
            s.work_id,
            w.title as work_title
        FROM paragraphs p
        JOIN sections s ON p.section_id = s.id
        JOIN works w ON s.work_id = w.id
        WHERE p.text LIKE ?
    `;

    let params: any[] = [searchPattern];

    // LOAD_STABILIZE_MODE: Only search in allowed works and first N sections
    if (LOAD_STABILIZE_MODE && ALLOWED_WORK_IDS.length > 0) {
        const placeholders = ALLOWED_WORK_IDS.map(() => '?').join(',');
        sql += ` AND w.id IN (${placeholders}) AND s.order_index < ?`;
        params = [...params, ...ALLOWED_WORK_IDS, MAX_SECTIONS];
    }

    sql += ` ORDER BY w.order_index, s.order_index, p.order_index LIMIT ?`;
    params.push(limit);

    const results = await db.getAllAsync<any>(sql, params);

    return results.map(r => ({
        sectionId: r.section_id,
        sectionTitle: r.section_title,
        workId: r.work_id,
        workTitle: r.work_title,
        chunkIndex: r.chunk_index,
        snippet: r.snippet?.substring(0, 200) || ''
    }));
};

// Alias for backward compatibility
export const getRisaleWorks = getAllWorks;
