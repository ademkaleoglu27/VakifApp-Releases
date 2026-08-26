import AsyncStorage from '@react-native-async-storage/async-storage';
import { RisaleBook, getRisaleLocalPath } from '@/config/risaleSources';
import * as FileSystem from 'expo-file-system';

const PROGRESS_KEY_PREFIX = 'risale_progress_';
const LAST_BOOK_KEY = 'risale_last_book_id';

export interface ReadingProgress {
    lastPage: number;
    updatedAt: number;
}

export const RisaleDownloadService = {
    // Deprecated but kept for compatibility logic if needed
    // In asset bundle mode, everything is always "downloaded" once init is done.

    // Returns true to signal "downloaded"
    async isBookReady(fileName: string): Promise<boolean> {
        const path = getRisaleLocalPath(fileName);
        const info = await FileSystem.getInfoAsync(path);
        return info.exists;
    },

    async saveProgress(bookId: string, page: number) {
        const data: ReadingProgress = { lastPage: page, updatedAt: Date.now() };
        await AsyncStorage.setItem(`${PROGRESS_KEY_PREFIX}${bookId}`, JSON.stringify(data));
        await AsyncStorage.setItem(LAST_BOOK_KEY, bookId);
    },

    async getProgress(bookId: string): Promise<ReadingProgress | null> {
        const json = await AsyncStorage.getItem(`${PROGRESS_KEY_PREFIX}${bookId}`);
        return json ? JSON.parse(json) : null;
    },

    async getLastReadBookId(): Promise<string | null> {
        return AsyncStorage.getItem(LAST_BOOK_KEY);
    }
};
