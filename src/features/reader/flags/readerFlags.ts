/**
 * Reader Feature Flags v1.0
 * 
 * Controls Native Reader Engine rollout.
 * Default: OFF - All readers use legacy implementation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Sözler book ID - Only book enabled for Native Reader initially */
export const SOZLER_BOOK_ID = 'risale.sozler@diyanet.tr';

/** Storage key for persisted flags */
const STORAGE_KEY = '@reader_flags';

// ═══════════════════════════════════════════════════════════════
// FLAGS STATE
// ═══════════════════════════════════════════════════════════════

export interface ReaderFlagsState {
    /** Master switch for Native Reader */
    useNativeReader: boolean;
    /** Book IDs allowed for Native Reader (whitelist) */
    allowedBookIdsForNative: string[];
}

/** Runtime flags - mutable */
export const ReaderFlags: ReaderFlagsState = {
    useNativeReader: false,
    allowedBookIdsForNative: [SOZLER_BOOK_ID],
};

// ═══════════════════════════════════════════════════════════════
// FLAG OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Load flags from AsyncStorage on app start.
 * Call this in App.tsx or splash screen.
 */
export async function loadReaderFlags(): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<ReaderFlagsState>;
            if (typeof parsed.useNativeReader === 'boolean') {
                ReaderFlags.useNativeReader = parsed.useNativeReader;
            }
            // allowedBookIds is locked - not persisted
        }
        console.log('[ReaderFlags] Loaded:', ReaderFlags);
    } catch (e) {
        console.warn('[ReaderFlags] Failed to load:', e);
    }
}

/**
 * Set Native Reader toggle and persist.
 */
export async function setUseNativeReader(enabled: boolean): Promise<void> {
    ReaderFlags.useNativeReader = enabled;
    try {
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ useNativeReader: enabled })
        );
        console.log('[ReaderFlags] Saved useNativeReader:', enabled);
    } catch (e) {
        console.warn('[ReaderFlags] Failed to save:', e);
    }
}

/**
 * Check if Native Reader should be used for a given bookId.
 * Returns false if:
 * - Master switch is off
 * - Book is not in allowed list
 */
export function shouldUseNativeReader(bookId: string | undefined): boolean {
    if (!ReaderFlags.useNativeReader) {
        return false;
    }
    if (!bookId) {
        return false;
    }
    const isAllowed = ReaderFlags.allowedBookIdsForNative.includes(bookId);
    if (!isAllowed && __DEV__) {
        console.log(`[ReaderFlags] Native Reader only enabled for Sözler, got: ${bookId}`);
    }
    return isAllowed;
}

/**
 * Reset all flags to defaults.
 */
export async function resetReaderFlags(): Promise<void> {
    ReaderFlags.useNativeReader = false;
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        console.log('[ReaderFlags] Reset to defaults');
    } catch (e) {
        console.warn('[ReaderFlags] Failed to reset:', e);
    }
}
