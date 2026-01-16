/**
 * useReaderProgress v1.0
 * 
 * Hook for anchor/progress persistence.
 * Works with both Native and Legacy readers.
 * 
 * P4: Includes context checksum for deterministic restore.
 */

import { useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Anchor, ZoomPresetId } from '../engine/ReaderBridge';
import { DEFAULT_ZOOM_PRESET } from '../engine/ReaderBridge';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STORAGE_PREFIX = '@reader_progress_';
const CONTEXT_SNIPPET_LENGTH = 32;
const SEARCH_RANGE = 500; // P4: chars to search if checksum mismatch

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * P4: Generate simple hash from context string.
 */
function generateChecksum(text: string, offset: number): string {
    const start = Math.max(0, offset - 16);
    const end = Math.min(text.length, offset + 16);
    const snippet = text.slice(start, end);

    // Simple hash
    let hash = 0;
    for (let i = 0; i < snippet.length; i++) {
        const char = snippet.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * P4: Verify checksum and find corrected offset if mismatch.
 */
function verifyAndCorrectOffset(
    text: string,
    anchor: Anchor
): { offset: number; corrected: boolean } {
    if (!anchor.contextChecksum) {
        return { offset: anchor.charOffset, corrected: false };
    }

    const currentChecksum = generateChecksum(text, anchor.charOffset);

    if (currentChecksum === anchor.contextChecksum) {
        return { offset: anchor.charOffset, corrected: false };
    }

    // Checksum mismatch - search nearby
    console.log('[useReaderProgress] Checksum mismatch, searching nearby...');

    const searchStart = Math.max(0, anchor.charOffset - SEARCH_RANGE);
    const searchEnd = Math.min(text.length, anchor.charOffset + SEARCH_RANGE);

    for (let offset = anchor.charOffset; offset < searchEnd; offset++) {
        if (generateChecksum(text, offset) === anchor.contextChecksum) {
            console.log(`[useReaderProgress] Found match at offset ${offset} (was ${anchor.charOffset})`);
            return { offset, corrected: true };
        }
    }

    for (let offset = anchor.charOffset - 1; offset >= searchStart; offset--) {
        if (generateChecksum(text, offset) === anchor.contextChecksum) {
            console.log(`[useReaderProgress] Found match at offset ${offset} (was ${anchor.charOffset})`);
            return { offset, corrected: true };
        }
    }

    // No match found - use original (no crash)
    console.warn('[useReaderProgress] No checksum match found, using original offset');
    return { offset: anchor.charOffset, corrected: false };
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export interface UseReaderProgressOptions {
    bookId: string;
    sectionUid: string;
}

export interface UseReaderProgressResult {
    /** Load saved anchor for this book/section */
    loadAnchor: () => Promise<Anchor | null>;

    /** Save current anchor */
    saveAnchor: (charOffset: number, zoomPresetId: ZoomPresetId, text: string) => Promise<void>;

    /** Verify and correct anchor offset based on text content */
    verifyAnchor: (anchor: Anchor, text: string) => { offset: number; corrected: boolean };

    /** Clear saved anchor */
    clearAnchor: () => Promise<void>;
}

export function useReaderProgress(
    options: UseReaderProgressOptions
): UseReaderProgressResult {
    const { bookId, sectionUid } = options;
    const storageKey = `${STORAGE_PREFIX}${bookId}_${sectionUid}`;

    // Throttle saves
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<number>(-1);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const loadAnchor = useCallback(async (): Promise<Anchor | null> => {
        try {
            const stored = await AsyncStorage.getItem(storageKey);
            if (stored) {
                const anchor = JSON.parse(stored) as Anchor;
                console.log('[useReaderProgress] Loaded anchor:', anchor.charOffset);
                return anchor;
            }
        } catch (e) {
            console.warn('[useReaderProgress] Failed to load:', e);
        }
        return null;
    }, [storageKey]);

    const saveAnchor = useCallback(async (
        charOffset: number,
        zoomPresetId: ZoomPresetId,
        text: string
    ): Promise<void> => {
        // Skip if same position
        if (charOffset === lastSavedRef.current) return;

        // Cancel pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Throttle: save after 2 seconds
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const anchor: Anchor = {
                    bookId,
                    sectionUid,
                    charOffset,
                    timestamp: Date.now(),
                    zoomPresetId,
                    contextChecksum: generateChecksum(text, charOffset),
                };

                await AsyncStorage.setItem(storageKey, JSON.stringify(anchor));
                lastSavedRef.current = charOffset;
                console.log('[useReaderProgress] Saved anchor:', charOffset);
            } catch (e) {
                console.warn('[useReaderProgress] Failed to save:', e);
            }
        }, 2000);
    }, [bookId, sectionUid, storageKey]);

    const verifyAnchor = useCallback((
        anchor: Anchor,
        text: string
    ): { offset: number; corrected: boolean } => {
        return verifyAndCorrectOffset(text, anchor);
    }, []);

    const clearAnchor = useCallback(async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(storageKey);
            lastSavedRef.current = -1;
            console.log('[useReaderProgress] Cleared anchor');
        } catch (e) {
            console.warn('[useReaderProgress] Failed to clear:', e);
        }
    }, [storageKey]);

    return {
        loadAnchor,
        saveAnchor,
        verifyAnchor,
        clearAnchor,
    };
}
