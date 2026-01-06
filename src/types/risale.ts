export interface RisaleWork {
    id: string;
    title: string;
    category: string; // e.g., "Sözler", "Mektubat"
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
