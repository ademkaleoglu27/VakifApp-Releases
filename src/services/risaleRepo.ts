import { getDb } from './contentDb';

export interface RisaleWork {
    id: number;
    title: string;
    category: string;
    order_no: number;
}

export interface RisaleSection {
    id: number;
    work_id: number;
    title: string;
    order_no: number;
}

export interface RisaleChunk {
    id: number;
    section_id: number;
    chunk_no: number;
    text_tr: string;
}

export const getRisaleWorks = async (): Promise<RisaleWork[]> => {
    const db = getDb();
    return await db.getAllAsync<RisaleWork>('SELECT * FROM r_work ORDER BY order_no ASC');
};

export const getSectionsByWork = async (workId: number): Promise<RisaleSection[]> => {
    const db = getDb();
    return await db.getAllAsync<RisaleSection>(
        'SELECT * FROM r_section WHERE work_id = ? ORDER BY order_no ASC',
        [workId]
    );
};

export const getChunksBySection = async (sectionId: number): Promise<RisaleChunk[]> => {
    const db = getDb();
    return await db.getAllAsync<RisaleChunk>(
        'SELECT * FROM r_chunk WHERE section_id = ? ORDER BY chunk_no ASC',
        [sectionId]
    );
};

export const getSectionById = async (sectionId: number): Promise<RisaleSection | null> => {
    const db = getDb();
    return await db.getFirstAsync<RisaleSection>('SELECT * FROM r_section WHERE id = ?', [sectionId]);
};
