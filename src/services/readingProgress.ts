import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_PREFIX = 'reading_progress_';

export interface ReadingProgress {
    chapterId: string;
    chapterIndex: number;
    timestamp: number;
}

/**
 * Get the last-read chapter for a book.
 */
export const getLastRead = async (bookId: string): Promise<ReadingProgress | null> => {
    try {
        const raw = await AsyncStorage.getItem(`${PROGRESS_PREFIX}${bookId}`);
        if (!raw) return null;
        return JSON.parse(raw) as ReadingProgress;
    } catch (e) {
        console.warn('[ReadingProgress] Failed to read:', e);
        return null;
    }
};

/**
 * Save the current reading position for a book.
 */
export const saveLastRead = async (bookId: string, chapterId: string, chapterIndex: number): Promise<void> => {
    try {
        const data: ReadingProgress = { chapterId, chapterIndex, timestamp: Date.now() };
        await AsyncStorage.setItem(`${PROGRESS_PREFIX}${bookId}`, JSON.stringify(data));
    } catch (e) {
        console.warn('[ReadingProgress] Failed to save:', e);
    }
};
