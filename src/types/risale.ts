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
    section_index?: number;
    type?: string;
    parent_id?: string | null;
}

export interface RisaleChunk {
    id: number;
    section_id: string;
    chunk_no: number;
    text_tr: string;
    page_no?: number;
}

export interface ReadingLog {
    id: string;
    userId: string;
    workId: string;
    workTitle: string; // Denormalized for easy display
    section: string;
    durationMinutes: number;
    pagesRead: number;
    date: string; // ISO date string
    note?: string;
}

export interface WeeklyReadingStats {
    totalMinutes: number;
    totalPages: number;
    dailyBreakdown: { date: string; minutes: number }[];
}
