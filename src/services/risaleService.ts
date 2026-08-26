import { ReadingLog, RisaleWork, WeeklyReadingStats } from '@/types/risale';

const MOCK_WORKS: RisaleWork[] = [
    { id: '1', title: 'Sözler', category: 'Külliyat' },
    { id: '2', title: 'Mektubat', category: 'Külliyat' },
    { id: '3', title: 'Lemalar', category: 'Külliyat' },
    { id: '4', title: 'Şualar', category: 'Külliyat' },
    { id: '5', title: 'Tarihçe-i Hayat', category: 'Külliyat' },
];

let MOCK_LOGS: ReadingLog[] = [
    {
        id: '101',
        userId: '1',
        workId: '1',
        workTitle: 'Sözler',
        section: '1. Söz',
        durationMinutes: 15,
        pagesRead: 5,
        date: new Date().toISOString(),
    },
];

const WAIT_TIME = 600;

export const risaleService = {
    getWorks: async (): Promise<RisaleWork[]> => {
        return new Promise((resolve) => setTimeout(() => resolve(MOCK_WORKS), WAIT_TIME));
    },

    getLogs: async (): Promise<ReadingLog[]> => {
        return new Promise((resolve) => setTimeout(() => resolve(MOCK_LOGS), WAIT_TIME));
    },

    addLog: async (log: Omit<ReadingLog, 'id' | 'workTitle'>): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const work = MOCK_WORKS.find((w) => w.id === log.workId);
                const newLog: ReadingLog = {
                    ...log,
                    id: Math.random().toString(),
                    workTitle: work?.title || 'Bilinmiyor',
                };
                MOCK_LOGS = [newLog, ...MOCK_LOGS];
                resolve();
            }, WAIT_TIME);
        });
    },

    getWeeklyStats: async (): Promise<WeeklyReadingStats> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    totalMinutes: 120,
                    totalPages: 45,
                    dailyBreakdown: [
                        { date: '2023-12-25', minutes: 30 },
                        { date: '2023-12-26', minutes: 45 },
                        { date: '2023-12-27', minutes: 45 },
                    ],
                });
            }, WAIT_TIME);
        });
    },
};
