import { getDb } from './contentDb';
import { RisaleWork, RisaleSection, RisaleChunk } from '@/types/risale';

export { RisaleWork, RisaleSection, RisaleChunk };

// ════════════════════════════════════════════════════════════════
// LOAD & STABILIZE MODE
// Set to true to only show Sözler (first 5 sections)
// ════════════════════════════════════════════════════════════════
const LOAD_STABILIZE_MODE = false;
const ALLOWED_WORK_IDS = ['sozler']; // Only Sözler
const MAX_SECTIONS = 5; // Birinci-Beşinci Söz

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
        // console.log("DEBUG RAW DB ROW:", JSON.stringify(results[0], null, 2));
    }
    return results.map(r => ({
        id: r.order_index,
        section_id: r.section_id,
        chunk_no: r.order_index,
        text_tr: r.text,
        page_no: r.page_no || 0,
        type: r.type || 'paragraph',
        meta: r.meta_json ? JSON.parse(r.meta_json) : undefined
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
        order_no: r.order_index,
        book_id: r.book_id,
        section_uid: r.section_uid,
        version: r.version
    };
};

export const getSectionsByBookId = async (bookId: string, version?: string): Promise<RisaleSection[]> => {
    const db = getDb();

    let sql = 'SELECT * FROM sections WHERE book_id = ? AND type != ?';
    let params: any[] = [bookId, 'footnote'];

    if (version) {
        sql += ' AND (version = ? OR version IS NULL)';
        params.push(version);
    }

    sql += ' ORDER BY order_index ASC';

    const results = await db.getAllAsync<any>(sql, params);
    return results.map(r => ({
        id: r.id, // Legacy ID currently still primary key, but section_uid is the logical key
        work_id: r.work_id,
        title: r.title,
        order_no: r.order_index,
        section_index: r.order_index,
        type: r.type || 'main',
        parent_id: r.parent_id,
        book_id: r.book_id,
        section_uid: r.section_uid,
        version: r.version
    }));
};

export const getSectionByUid = async (bookId: string, sectionUid: string, version?: string): Promise<RisaleSection | null> => {
    const db = getDb();

    let sql = 'SELECT * FROM sections WHERE book_id = ? AND section_uid = ?';
    let params: any[] = [bookId, sectionUid];

    if (version) {
        sql += ' AND (version = ? OR version IS NULL)';
        params.push(version);
    }

    const r = await db.getFirstAsync<any>(sql, params);
    if (!r) return null;
    return {
        id: r.id,
        work_id: r.work_id,
        title: r.title,
        order_no: r.order_index,
        book_id: r.book_id,
        section_uid: r.section_uid,
        version: r.version
    };
};

export const getSectionsByWork = async (workId: string): Promise<RisaleSection[]> => {
    const db = getDb();

    // LOAD_STABILIZE_MODE: Limit to first 5 sections
    const limit = LOAD_STABILIZE_MODE ? MAX_SECTIONS : 999;

    // Return all sections (main + sub) with hierarchy info, exclude footnotes from TOC
    const results = await db.getAllAsync<any>(
        'SELECT * FROM sections WHERE work_id = ? AND type != ? ORDER BY order_index ASC LIMIT ?',
        [workId, 'footnote', limit]
    );
    return results.map(r => ({
        id: r.id,
        work_id: r.work_id,
        title: r.title,
        order_no: r.order_index,
        section_index: r.order_index,
        type: r.type || 'main',
        parent_id: r.parent_id,
        book_id: r.book_id,
        section_uid: r.section_uid,
        version: r.version
    }));
};

export const getNextSection = async (workId: string, currentSectionId: string): Promise<{ id: string; title: string } | null> => {
    const db = getDb();

    // 1. Get current section's order index
    const current = await db.getFirstAsync<any>(
        'SELECT order_index FROM sections WHERE id = ? OR section_uid = ?',
        [currentSectionId, currentSectionId]
    );
    if (!current) return null;

    // 2. Find the immediate next section (main or sub, but not footnote)
    // We strictly use order_index > current.order_index to find the next one.
    const next = await db.getFirstAsync<any>(
        'SELECT id, title, section_uid FROM sections WHERE work_id = ? AND order_index > ? AND type != ? ORDER BY order_index ASC LIMIT 1',
        [workId, current.order_index, 'footnote']
    );

    if (!next) return null;
    // V2: Return UID as ID if available to ensure forward navigation uses world standard
    return { id: next.section_uid || next.id, title: next.title };
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

// ════════════════════════════════════════════════════════════════
// CONTINUOUS READING STREAM
// ════════════════════════════════════════════════════════════════

export type StreamItemType = 'section_header' | 'sub_header' | 'page';

export interface StreamItem {
    type: StreamItemType;
    id: string;
    sectionId: string;
    sectionUid?: string; // V2 Identity
    title?: string;
    chunks?: RisaleChunk[];
    orderIndex: number;
    globalPageOrdinal?: number;  // 1-indexed global page number for display
}

/**
 * Build a continuous reading stream for an entire work.
 * Returns array of StreamItems: headers interleaved with page chunks.
 */
export const buildReadingStream = async (workId: string): Promise<StreamItem[]> => {
    const db = getDb();
    const stream: StreamItem[] = [];
    let globalOrderIndex = 0;
    let globalPageOrdinal = 0;  // Track global page number for display

    // 1. Fetch all sections (main + sub, exclude footnotes) in order
    const sections = await db.getAllAsync<any>(
        'SELECT * FROM sections WHERE work_id = ? AND type != ? ORDER BY order_index ASC',
        [workId, 'footnote']
    );

    // 2. For each section, add header + paginated chunks
    for (const section of sections) {
        const sectionId = section.id;
        const sectionTitle = section.title;
        const isMain = section.type === 'main' || !section.parent_id;

        // Add section header
        stream.push({
            type: isMain ? 'section_header' : 'sub_header',
            id: `header-${sectionId}`,
            sectionId,
            sectionUid: section.section_uid,
            title: sectionTitle,
            orderIndex: globalOrderIndex++
        });

        // Fetch paragraphs for this section
        const paragraphs = await db.getAllAsync<any>(
            'SELECT * FROM paragraphs WHERE section_id = ? ORDER BY order_index ASC',
            [sectionId]
        );

        // Group into pages (7 paragraphs per page)
        const CHUNKS_PER_PAGE = 7;
        const chunks: RisaleChunk[] = paragraphs.map((p: any) => ({
            id: p.order_index,
            section_id: p.section_id,
            chunk_no: p.order_index,
            text_tr: p.text,
            page_no: p.page_no || 0
        }));

        for (let i = 0; i < chunks.length; i += CHUNKS_PER_PAGE) {
            const pageChunks = chunks.slice(i, i + CHUNKS_PER_PAGE);
            const pageIndex = Math.floor(i / CHUNKS_PER_PAGE);
            globalPageOrdinal++;  // Increment global page counter

            stream.push({
                type: 'page',
                id: `page-${sectionId}-${pageIndex}`,
                sectionId,
                chunks: pageChunks,
                orderIndex: globalOrderIndex++,
                globalPageOrdinal
            });
        }
    }

    console.log(`[Stream] Built ${stream.length} items for work ${workId}, total pages: ${globalPageOrdinal}`);
    return stream;
};

/**
 * Build reading stream using Canonical Book ID (World Standard).
 */
export const buildReadingStreamByBookId = async (bookId: string): Promise<StreamItem[]> => {
    const db = getDb();
    const stream: StreamItem[] = [];
    let globalOrderIndex = 0;
    let globalPageOrdinal = 0;

    // 1. Fetch sections by book_id
    const sections = await db.getAllAsync<any>(
        'SELECT * FROM sections WHERE book_id = ? AND type != ? ORDER BY order_index ASC',
        [bookId, 'footnote']
    );

    // 2. Build stream
    for (const section of sections) {
        const sectionId = section.id; // Internal ID for linking paragraphs
        const sectionTitle = section.title;
        const isMain = section.type === 'main' || !section.parent_id;

        stream.push({
            type: isMain ? 'section_header' : 'sub_header',
            id: `header-${sectionId}`,
            sectionId,
            sectionUid: section.section_uid,
            title: sectionTitle,
            orderIndex: globalOrderIndex++
        });

        const paragraphs = await db.getAllAsync<any>(
            'SELECT * FROM paragraphs WHERE section_id = ? ORDER BY order_index ASC',
            [sectionId]
        );

        const CHUNKS_PER_PAGE = 7;
        const chunks: RisaleChunk[] = paragraphs.map((p: any) => ({
            id: p.order_index,
            section_id: p.section_id,
            chunk_no: p.order_index,
            text_tr: p.text,
            page_no: p.page_no || 0
        }));

        for (let i = 0; i < chunks.length; i += CHUNKS_PER_PAGE) {
            const pageChunks = chunks.slice(i, i + CHUNKS_PER_PAGE);
            const pageIndex = Math.floor(i / CHUNKS_PER_PAGE);
            globalPageOrdinal++;

            stream.push({
                type: 'page',
                id: `page-${sectionId}-${pageIndex}`,
                sectionId,
                chunks: pageChunks,
                orderIndex: globalOrderIndex++,
                globalPageOrdinal
            });
        }
    }

    console.log(`[Stream] Built ${stream.length} items for bookId ${bookId}`);
    return stream;
};

/**
 * Build a section-only reading stream (V25.6)
 * Optimized for TOC navigation to avoid scroll jumps.
 * Calculates global page ordinal but only loads the target section.
 */
export const buildSectionReadingStream = async (workId: string, targetSectionId: string): Promise<StreamItem[]> => {
    const db = getDb();
    const stream: StreamItem[] = [];
    let globalOrderIndex = 0;
    let globalPageOrdinal = 0;  // Track global page number

    // 1. Fetch all sections order (lightweight)
    const sections = await db.getAllAsync<any>(
        'SELECT id, title, type, section_uid FROM sections WHERE work_id = ? AND type != ? ORDER BY order_index ASC',
        [workId, 'footnote']
    );

    // 2. Iterate sections until we find target
    for (const section of sections) {
        const sectionId = section.id;
        const sectionUid = section.section_uid;

        // Count pages efficiently
        const paragraphCount = (await db.getFirstAsync<any>(
            'SELECT COUNT(*) as count FROM paragraphs WHERE section_id = ?',
            [sectionId]
        )).count;

        const CHUNKS_PER_PAGE = 7;
        const pageCount = Math.ceil(paragraphCount / CHUNKS_PER_PAGE);

        if (sectionId === targetSectionId || sectionUid === targetSectionId) {
            // THIS IS THE TARGET SECTION - BUILD IT FULLY
            // Add section header
            stream.push({
                type: section.type === 'main' ? 'section_header' : 'sub_header',
                id: `header-${sectionId}`,
                sectionId,
                title: section.title,
                orderIndex: globalOrderIndex++
            });

            // Fetch paragraphs for this section
            const paragraphs = await db.getAllAsync<any>(
                'SELECT * FROM paragraphs WHERE section_id = ? ORDER BY order_index ASC',
                [sectionId]
            );

            // Group into pages
            const chunks: RisaleChunk[] = paragraphs.map((p: any) => ({
                id: p.order_index,
                section_id: p.section_id,
                chunk_no: p.order_index,
                text_tr: p.text,
                page_no: p.page_no || 0
            }));

            for (let i = 0; i < chunks.length; i += CHUNKS_PER_PAGE) {
                const pageChunks = chunks.slice(i, i + CHUNKS_PER_PAGE);
                const pageIndex = Math.floor(i / CHUNKS_PER_PAGE);
                globalPageOrdinal++;  // Increment global page counter

                stream.push({
                    type: 'page',
                    id: `page-${sectionId}-${pageIndex}`,
                    sectionId,
                    chunks: pageChunks,
                    orderIndex: globalOrderIndex++,
                    globalPageOrdinal // Correct global ordinal!
                });
            }
            break; // Stop after building target section
        } else {
            // NOT TARGET - JUST SKIP PAGES (Add offset)
            globalPageOrdinal += pageCount;
            // We assume stream item indices (orderIndex) are local to this partial stream?
            // Actually orderIndex assumes 0-based for flashlist. So we just reset globalOrderIndex 0 at start and increment.
            // But globalPageOrdinal accumulates.
        }
    }

    console.log(`[SectionStream] Built ${stream.length} items for section ${targetSectionId}, starting at global page ${globalPageOrdinal - stream.filter(x => x.type === 'page').length + 1}`);
    return stream;
};

/**
 * Build TOC to Stream Index mapping for jump navigation.
 */
export const buildTocIndexMap = (stream: StreamItem[]): Map<string, number> => {
    const map = new Map<string, number>();
    stream.forEach((item, idx) => {
        if (item.type === 'section_header' || item.type === 'sub_header') {
            map.set(item.sectionId, idx);
            if (item.sectionUid) {
                map.set(item.sectionUid, idx);
            }
        }
    });
    return map;
};

/**
 * Section page mapping for deterministic TOC navigation (V25.1)
 */
export interface SectionPageMapping {
    sectionId: string;
    firstPageIndex: number;       // Stream index of first page item
    firstGlobalPageOrdinal: number;  // Global page number (1-indexed)
}

/**
 * Build section-to-first-page mapping for deterministic TOC navigation.
 * Returns map from sectionId (and sectionUid) to its first page info.
 */
export const buildSectionPageMap = (stream: StreamItem[]): Map<string, SectionPageMapping> => {
    const map = new Map<string, SectionPageMapping>();
    const seenSections = new Set<string>();

    stream.forEach((item, idx) => {
        // Only track first page for each section
        if (item.type === 'page' && !seenSections.has(item.sectionId)) {
            seenSections.add(item.sectionId);
            const info = {
                sectionId: item.sectionId,
                firstPageIndex: idx,
                firstGlobalPageOrdinal: item.globalPageOrdinal || 1,
            };
            map.set(item.sectionId, info);
            if (item.sectionUid) {
                map.set(item.sectionUid, info);
            }
        }
    });

    return map;
};

// ════════════════════════════════════════════════════════════════
// FOOTNOTES (Diamond Standard V23.1)
// ════════════════════════════════════════════════════════════════

// Footnote cache to prevent re-fetching
const footnoteCache = new Map<string, RisaleChunk[]>();

/**
 * Get footnotes for a section by parent_id.
 * Returns chunks with text content for the footnote.
 * Cached for performance.
 */
export const getFootnotesBySectionId = async (sectionId: string): Promise<{ id: string, title: string, chunks: RisaleChunk[] }[]> => {
    const cacheKey = `fn-${sectionId}`;

    const db = getDb();

    // 1. Find footnote sections with this parent_id
    const footnotes = await db.getAllAsync<any>(
        'SELECT * FROM sections WHERE parent_id = ? AND type = ? ORDER BY order_index ASC',
        [sectionId, 'footnote']
    );

    if (!footnotes || footnotes.length === 0) return [];

    const result: { id: string, title: string, chunks: RisaleChunk[] }[] = [];

    for (const fn of footnotes) {
        // Check cache first
        if (footnoteCache.has(fn.id)) {
            result.push({
                id: fn.id,
                title: fn.title,
                chunks: footnoteCache.get(fn.id)!
            });
            continue;
        }

        // Fetch paragraphs for this footnote
        const paragraphs = await db.getAllAsync<any>(
            'SELECT * FROM paragraphs WHERE section_id = ? ORDER BY order_index ASC',
            [fn.id]
        );

        const chunks: RisaleChunk[] = paragraphs.map((p: any) => ({
            id: p.order_index,
            section_id: p.section_id,
            chunk_no: p.order_index,
            text_tr: p.text,
            page_no: p.page_no || 0
        }));

        // Cache for future use
        footnoteCache.set(fn.id, chunks);

        result.push({
            id: fn.id,
            title: fn.title,
            chunks
        });
    }

    return result;
};

/**
 * Extract footnote number from text like "[1] Haşiye:"
 */
export const extractFootnoteNumber = (title: string): number | null => {
    const match = title.match(/^\[(\d+)\]/);
    return match ? parseInt(match[1], 10) : null;
};
