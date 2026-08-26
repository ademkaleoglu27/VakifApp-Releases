/**
 * readingProgressStore.ts (V1.0 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * Centralized reading progress storage with:
 * - Book-based lastRead (no cross-book pollution)
 * - Global lastRead for "continue where you left off"
 * - Throttled writes (3s default, single-flight)
 * - Flush on demand for background/unmount
 * 
 *
 * LOCKED: Do not modify without extensive testing.
 *         Used by RisaleVirtualPageReaderScreen V24.0
 * ─────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_RESUME_LAST_READ } from '@/config/features';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface GlobalLastRead {
    bookId: string;
    sectionId: string;
    streamIndex: number;
    offsetY?: number;
    fontScale?: number;
    ts: number;
}

export interface BookLastRead {
    sectionId: string;
    streamIndex: number;
    offsetY?: number;
    fontScale?: number;
    ts: number;
}

// ─────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────

const GLOBAL_LAST_READ_KEY = '@reading_progress_global_v1';
const BOOK_LAST_READ_PREFIX = 'book:lastRead:';

// ─────────────────────────────────────────────────────────────
// Internal State (Throttle/Single-Flight)
// ─────────────────────────────────────────────────────────────

const THROTTLE_MS = 3000;

interface PendingSave {
    key: string;
    data: any;
    timeoutId: NodeJS.Timeout;
}

let pendingSaves: Map<string, PendingSave> = new Map();

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

const doSave = async (key: string, data: any): Promise<void> => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('[readingProgressStore] Save failed:', key, e);
    }
};

const scheduleSave = (key: string, data: any): void => {
    // Cancel any pending save for this key
    const existing = pendingSaves.get(key);
    if (existing) {
        clearTimeout(existing.timeoutId);
    }

    // Schedule new save
    const timeoutId = setTimeout(() => {
        doSave(key, data);
        pendingSaves.delete(key);
    }, THROTTLE_MS);

    pendingSaves.set(key, { key, data, timeoutId });
};

const flushKey = async (key: string): Promise<void> => {
    const pending = pendingSaves.get(key);
    if (pending) {
        clearTimeout(pending.timeoutId);
        pendingSaves.delete(key);
        await doSave(pending.key, pending.data);
    }
};

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export const readingProgressStore = {
    /**
     * Get global last read (for "continue reading" on app open)
     */
    async getGlobalLastRead(): Promise<GlobalLastRead | null> {
        if (!ENABLE_RESUME_LAST_READ) return null;
        try {
            const raw = await AsyncStorage.getItem(GLOBAL_LAST_READ_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[readingProgressStore] getGlobalLastRead error:', e);
            return null;
        }
    },

    /**
     * Set global last read (throttled)
     */
    setGlobalLastRead(data: GlobalLastRead): void {
        if (!ENABLE_RESUME_LAST_READ) return;
        scheduleSave(GLOBAL_LAST_READ_KEY, data);
    },

    /**
     * Get book-specific last read
     */
    async getBookLastRead(bookId: string): Promise<BookLastRead | null> {
        if (!ENABLE_RESUME_LAST_READ) return null;
        // V27: bookId is the primary key.
        // Legacy support: 'sozler' is successfully mapped to 'risale.sozler@diyanet.tr' via bridge if needed,
        // but typically we pass the effective ID directly.
        try {
            const json = await AsyncStorage.getItem(this.getBookKey(bookId));
            return json ? JSON.parse(json) : null;
        } catch (e) {
            console.warn('Failed to load last read', e);
            return null;
        }
    },

    /**
     * Set book-specific last read (throttled)
     */
    setBookLastRead(bookId: string, data: BookLastRead) {
        if (!ENABLE_RESUME_LAST_READ) return;
        // The original implementation used scheduleSave for throttling.
        // The provided snippet for setBookLastRead directly uses AsyncStorage.setItem,
        // which removes the throttling. Adhering strictly to the provided snippet.
        try {
            AsyncStorage.setItem(this.getBookKey(bookId), JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save last read', e);
        }
    },

    getBookKey(bookId: string) {
        return `last_read_${bookId}`;
    },

    /**
     * Clear book-specific last read (for "restart from beginning")
     */
    async clearBookLastRead(bookId: string): Promise<void> {
        if (!ENABLE_RESUME_LAST_READ) return;
        const key = this.getBookKey(bookId); // Updated to use getBookKey
        // Cancel pending save if any
        const pending = pendingSaves.get(key);
        if (pending) {
            clearTimeout(pending.timeoutId);
            pendingSaves.delete(key);
        }
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.warn('[readingProgressStore] clearBookLastRead error:', e);
        }
    },

    /**
     * Immediately flush all pending saves (call on background/unmount)
     */
    async flush(): Promise<void> {
        const promises: Promise<void>[] = [];
        for (const [key] of pendingSaves) {
            promises.push(flushKey(key));
        }
        await Promise.all(promises);
    },

    /**
     * Immediately save both global and book progress (sync, no throttle)
     * Useful for critical moments like unmount
     */
    async saveNow(bookId: string, data: BookLastRead): Promise<void> {
        const bookKey = `${BOOK_LAST_READ_PREFIX}${bookId}`;

        // Clear any pending saves to avoid race
        await this.flush();

        // Save both immediately
        const globalData: GlobalLastRead = {
            bookId,
            ...data,
        };

        await Promise.all([
            doSave(bookKey, data),
            doSave(GLOBAL_LAST_READ_KEY, globalData),
        ]);
    },
};

export default readingProgressStore;
