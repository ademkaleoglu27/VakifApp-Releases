// recentReads.ts - AsyncStorage-based recent reads tracking
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@library/recent_reads';
const MAX_RECENT_ITEMS = 10;

export interface RecentReadItem {
    id: string;
    bookId: string;
    chapterId?: string;
    title: string;
    cover?: string;
    timestamp: number;
}

/**
 * Add a book to recent reads
 */
export async function addRecentRead(item: Omit<RecentReadItem, 'timestamp'>): Promise<void> {
    try {
        const existing = await getRecentReads();

        // Remove existing entry for same book
        const filtered = existing.filter(r => r.bookId !== item.bookId);

        // Add new entry at the beginning
        const updated: RecentReadItem[] = [
            { ...item, timestamp: Date.now() },
            ...filtered
        ].slice(0, MAX_RECENT_ITEMS);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('[recentReads] Failed to add:', error);
    }
}

/**
 * Get all recent reads, sorted by timestamp (newest first)
 */
export async function getRecentReads(): Promise<RecentReadItem[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const items: RecentReadItem[] = JSON.parse(data);
        return items.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('[recentReads] Failed to get:', error);
        return [];
    }
}

/**
 * Clear all recent reads
 */
export async function clearRecentReads(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('[recentReads] Failed to clear:', error);
    }
}

/**
 * Update chapter progress for a book
 */
export async function updateRecentReadChapter(bookId: string, chapterId: string): Promise<void> {
    try {
        const existing = await getRecentReads();
        const updated = existing.map(item => {
            if (item.bookId === bookId) {
                return { ...item, chapterId, timestamp: Date.now() };
            }
            return item;
        });

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('[recentReads] Failed to update chapter:', error);
    }
}
