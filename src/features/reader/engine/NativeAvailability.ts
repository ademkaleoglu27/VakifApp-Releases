/**
 * NativeAvailability.ts v1.0
 * 
 * Single source of truth for Native Reader availability check.
 * Checks if NativeReaderView is registered in UIManager.
 */

import { UIManager, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// NATIVE VIEW NAME (SINGLE PLACE TO CHANGE)
// ═══════════════════════════════════════════════════════════════

export const NATIVE_READER_VIEW_NAME = 'NativeReaderView';

// ═══════════════════════════════════════════════════════════════
// STATUS TYPES
// ═══════════════════════════════════════════════════════════════

export type NativeReaderReason =
    | 'ok'
    | 'platform_not_android'
    | 'view_manager_missing'
    | 'flag_off'
    | 'book_not_allowed';

export interface NativeReaderStatus {
    ok: boolean;
    reason: NativeReaderReason;
    name?: string;
}

// ═══════════════════════════════════════════════════════════════
// AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check if NativeReaderView is registered and available.
 * Does NOT check flags - only native module registration.
 */
export function getNativeReaderStatus(): NativeReaderStatus {
    // Platform check
    if (Platform.OS !== 'android') {
        return {
            ok: false,
            reason: 'platform_not_android',
            name: NATIVE_READER_VIEW_NAME
        };
    }

    // View manager check
    const cfg = UIManager.getViewManagerConfig?.(NATIVE_READER_VIEW_NAME);

    if (!cfg) {
        return {
            ok: false,
            reason: 'view_manager_missing',
            name: NATIVE_READER_VIEW_NAME
        };
    }

    return {
        ok: true,
        reason: 'ok',
        name: NATIVE_READER_VIEW_NAME
    };
}

/**
 * Check if native view is available (shorthand).
 */
export function isNativeReaderAvailable(): boolean {
    return getNativeReaderStatus().ok;
}
