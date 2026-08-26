import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReadingProgress {
    sectionId: number;
    bookId?: number;
    pageIndex: number; // Virtual Page Index
    chunkId: number;   // Anchor Chunk ID (more precise)
    fontSize: number;
    updatedAt: number;
}

const STORAGE_KEY_PREFIX = 'reading_progress_';

export const ReadingProgressService = {
    async saveProgress(sectionId: number, progress: Omit<ReadingProgress, 'updatedAt' | 'sectionId'>) {
        try {
            const key = `${STORAGE_KEY_PREFIX}${sectionId}`;
            const data: ReadingProgress = {
                ...progress,
                sectionId,
                updatedAt: Date.now(),
            };
            await AsyncStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save reading progress', e);
        }
    },

    async loadProgress(sectionId: number): Promise<ReadingProgress | null> {
        try {
            const key = `${STORAGE_KEY_PREFIX}${sectionId}`;
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to load reading progress', e);
            return null;
        }
    }
};
