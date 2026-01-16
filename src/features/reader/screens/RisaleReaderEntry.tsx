/**
 * RisaleReaderEntry v1.2
 * 
 * Single entry point for all reader navigation.
 * P6: Feature flag + bookId allowlist gate.
 * 
 * Decision tree:
 * - native not available → legacy reader
 * - flag off → legacy reader
 * - flag on + bookId not allowed → legacy reader + dev toast
 * - flag on + bookId allowed + native available → native reader
 * 
 * DEV: Debug banner shows exact reason for native/legacy decision.
 * 
 * ACCEPTANCE CHECK:
 * - Sözler → TOC → Birinci Söz açınca:
 *   - Banner "NATIVE ON" görüyorsam → native çalışıyor
 *   - Banner "NATIVE OFF: view_manager_missing" → native Android tarafı register değil
 *   - Banner "NATIVE OFF: flag_off" → dev flag açılmamış
 *   - Banner "NATIVE OFF: book_not_allowed" → kitap allowlist'te değil
 */

import React, { useEffect, useState } from 'react';
import { Platform, ToastAndroid, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
    shouldUseNativeReader,
    SOZLER_BOOK_ID,
    ReaderFlags,
    loadReaderFlags,
    setUseNativeReader
} from '../flags/readerFlags';
import {
    getNativeReaderStatus,
    isNativeReaderAvailable,
    type NativeReaderReason
} from '../engine/NativeAvailability';
import { ReaderDebugBanner } from '../components/ReaderDebugBanner';

// Legacy reader
import { RisaleVirtualPageReaderScreen } from './RisaleVirtualPageReaderScreen';

// Native reader (Android only, lazy import)
const NativeReaderScreen = React.lazy(() =>
    import('./NativeReaderScreen').catch(() => ({
        default: () => null // Fallback if not available
    }))
);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ReaderEntryParams {
    bookId?: string;
    sectionId?: string;
    version?: string;
    workId?: string; // Legacy bridge
    workTitle?: string;
    source?: 'toc' | 'resume';
    mode?: 'section' | 'resume';
    resumeLocation?: {
        streamIndex: number;
        sectionId?: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const RisaleReaderEntry = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const params = (route.params ?? {}) as ReaderEntryParams;

    // Debug bar state (DEV only)
    const [dbgTick, setDbgTick] = useState(0);

    // Resolve bookId with legacy bridge support
    const bookId = params.bookId ??
        (params.workId === 'sozler' ? SOZLER_BOOK_ID : undefined);

    // Get native status from NativeAvailability
    const nativeStatus = getNativeReaderStatus();

    // P6: Determine which reader to use (flag + allowlist)
    const flagAllowsNative = shouldUseNativeReader(bookId);

    // Combined decision: native module available AND flag allows
    const useNative = nativeStatus.ok && flagAllowsNative;

    // Compute reason for debug banner
    const getDisplayReason = (): NativeReaderReason => {
        if (!nativeStatus.ok) return nativeStatus.reason;
        if (!ReaderFlags.useNativeReader) return 'flag_off';
        if (bookId && !ReaderFlags.allowedBookIdsForNative.includes(bookId)) return 'book_not_allowed';
        return 'ok';
    };
    const displayReason = getDisplayReason();

    // Load flags on mount (DEV only)
    useEffect(() => {
        if (__DEV__) {
            loadReaderFlags().then(() => setDbgTick(x => x + 1));
        }
    }, []);

    // Dev toast for decisions
    useEffect(() => {
        if (__DEV__ && !useNative && bookId) {
            const msg = `Native Reader: ${displayReason}`;
            if (Platform.OS === 'android') {
                ToastAndroid.show(msg, ToastAndroid.SHORT);
            }
            console.log(`[ReaderEntry] ${msg}, bookId=${bookId}`);
        }

        if (useNative) {
            console.log(`[ReaderEntry] Native Reader ENABLED for bookId=${bookId}`);
        }
    }, [useNative, bookId, displayReason]);

    // ═══════════════════════════════════════════════════════════════
    // DEBUG BAR (DEV ONLY)
    // ═══════════════════════════════════════════════════════════════

    // Toggle handler
    const toggle = async () => {
        await setUseNativeReader(!ReaderFlags.useNativeReader);
        await loadReaderFlags();
        setDbgTick(x => x + 1);
    };

    // Debug bar component (shows toggle + status)
    const DebugBar = __DEV__ ? (
        <View style={dbgStyles.container}>
            <ReaderDebugBanner
                isNativeActive={useNative}
                reason={displayReason}
                viewName={nativeStatus.name}
            />
            <View style={dbgStyles.toggleRow}>
                <Pressable
                    style={dbgStyles.button}
                    onPress={toggle}
                >
                    <Text style={dbgStyles.buttonText}>
                        Toggle Flag ({ReaderFlags.useNativeReader ? 'ON' : 'OFF'})
                    </Text>
                </Pressable>
            </View>
        </View>
    ) : null;

    // ═══════════════════════════════════════════════════════════════
    // ROUTE DECISION
    // ═══════════════════════════════════════════════════════════════

    if (useNative && Platform.OS === 'android') {
        // Native reader path (Android only)
        return (
            <View style={{ flex: 1 }}>
                {DebugBar}
                <React.Suspense fallback={<RisaleVirtualPageReaderScreen />}>
                    <NativeReaderScreen />
                </React.Suspense>
            </View>
        );
    }

    // Legacy reader path (default)
    return (
        <View style={{ flex: 1 }}>
            {DebugBar}
            <RisaleVirtualPageReaderScreen />
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════
// DEBUG BAR STYLES (DEV ONLY)
// ═══════════════════════════════════════════════════════════════

const dbgStyles = StyleSheet.create({
    container: {
        zIndex: 9999,
    },
    toggleRow: {
        backgroundColor: '#1e293b',
        padding: 6,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
});

export default RisaleReaderEntry;
