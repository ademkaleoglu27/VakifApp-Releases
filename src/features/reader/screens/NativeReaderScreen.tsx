/**
 * NativeReaderScreen v1.4
 * 
 * This screen hosts the NativeReaderView with enhanced debug HUD.
 * Uses NativeAvailability for safe fallback.
 * PHASE 1: Full Debug HUD with all stability metrics.
 * PHASE 3: Gesture state machine + Selected word overlay.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { NativeReaderView } from '../engine/NativeReaderView';
import { getNativeReaderStatus, isNativeReaderAvailable } from '../engine/NativeAvailability';
import { ReaderDebugBanner } from '../components/ReaderDebugBanner';
import { NativeReaderDebugHUD } from '../debug/NativeReaderDebugHUD';
import { SelectedWordOverlay } from '../debug/SelectedWordOverlay';
import {
    initialDebugState,
    createWordTapUpdate,
    createZoomCommitUpdate,
    createScrollUpdate,
    createGestureStateUpdate,
    createMetricsUpdate,
    createErrorUpdate,
    type ReaderDebugState
} from '../debug/ReaderDebugStore';
import { useReaderProgress } from '../hooks/useReaderProgress';
import { SOZLER_BOOK_ID } from '../flags/readerFlags';
import type { WordTapEvent, ZoomCommitEvent, Anchor, ZoomPresetId, SelectionEvent, ErrorEvent } from '../engine/ReaderBridge';
import { DEFAULT_ZOOM_PRESET } from '../engine/ReaderBridge';
import { buildSectionReadingStream, StreamItem } from '@/services/risaleRepo';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const NativeReaderScreen = () => {
    const route = useRoute<any>();
    const nativeReaderRef = useRef<any>(null);

    // Get native status
    const nativeStatus = getNativeReaderStatus();

    // Extract params
    const { bookId = SOZLER_BOOK_ID, sectionId, workId } = route.params ?? {};
    const effectiveSectionId = sectionId ?? 'birinci-soz';

    // State
    const [zoomPreset, setZoomPreset] = useState<ZoomPresetId>(DEFAULT_ZOOM_PRESET);
    const [text, setText] = useState<string>('');

    // PHASE 1: Enhanced Debug HUD State
    const [debugState, setDebugState] = useState<ReaderDebugState>({
        ...initialDebugState,
        nativeEnabled: nativeStatus.ok,
        zoomPresetId: DEFAULT_ZOOM_PRESET,
    });

    // Progress hook
    const progress = useReaderProgress({
        bookId,
        sectionUid: effectiveSectionId,
    });

    // Load content
    const { data: stream, isLoading } = useQuery({
        queryKey: ['nativeReaderStream', workId ?? 'sozler', effectiveSectionId],
        queryFn: async () => {
            const internalWorkId = workId ?? 'sozler';
            return buildSectionReadingStream(internalWorkId, effectiveSectionId);
        },
    });

    // Build text from stream
    useEffect(() => {
        if (!stream) return;

        const paragraphs: string[] = [];
        stream.forEach((item: StreamItem) => {
            if (item.chunks) {
                item.chunks.forEach(chunk => {
                    if (chunk.text_tr) {
                        paragraphs.push(chunk.text_tr);
                    }
                });
            }
        });

        // P3: Join with \n\n delimiter (Content Contract)
        const fullText = paragraphs.join('\n\n');
        setText(fullText);
        console.log(`[NativeReader] Loaded ${paragraphs.length} paragraphs (${fullText.length} chars)`);

        // Update debug state with layout info
        setDebugState(prev => ({
            ...prev,
            layoutVersion: prev.layoutVersion + 1,
        }));
    }, [stream]);

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS (with Debug HUD update)
    // ═══════════════════════════════════════════════════════════════

    const handleWordTap = useCallback((event: WordTapEvent) => {
        // HAYRAT GATE: Check if interactive
        // We use a ref based check for immediate blocking if needed, but here we can check state
        // However, state inside callback might be stale if not careful.
        // Actually, let's use the functional update to check and increment reject count if needed.
        // BEWARE: This callback depends on [] so it captures initial state? 
        // No, we are using setDebugState(updater).
        // But we want to prevent side effects (popup opening).

        // For strict gating, we need access to the latest state or a ref.
        // Let's rely on the native side guard for the critical "during scroll" events.
        // But for the "settling" phase (JS only), we need to check here.

        setDebugState(prev => {
            if (prev.lugatGate === 'CLOSED') {
                console.log('[NativeReader] WordTap BLOCKED (Gate Closed:', prev.lastGateReason, ')');
                return {
                    ...prev,
                    gateRejectCount: prev.gateRejectCount + 1,
                    lastWordTap: {
                        ...event,
                        hitTestSource: 'stale_fallback' // Mark as ignored/stale
                    } as any // Cast to keep types happy quickly
                };
            }

            // If OPEN, proceed to update tap info
            console.log('[NativeReader] WordTap Allowed:', event.wordRaw);

            // TODO: Open lugat overlay here (Trigger external action)

            return createWordTapUpdate(event)(prev);
        });
    }, []);

    // ═══════════════════════════════════════════════════════════════
    // HAYRAT GATE TICKER
    // ═══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (debugState.lugatGate === 'CLOSED') {
            // Check frequently if we can open
            const timer = setInterval(() => {
                setDebugState(prev => {
                    const now = Date.now();
                    if (prev.lugatGate === 'CLOSED' && now >= prev.settleUntilMs) {
                        const isSafe = prev.scrollState === 'IDLE' &&
                            prev.gestureMode !== 'PINCH_ACTIVE';
                        if (isSafe) {
                            return { ...prev, lugatGate: 'OPEN', lastGateReason: 'NONE' };
                        }
                    }
                    return prev;
                });
            }, 50);
            return () => clearInterval(timer);
        }
    }, [debugState.lugatGate]);

    const handleZoomCommit = useCallback((event: ZoomCommitEvent) => {
        console.log('[NativeReader] ZoomCommit:', {
            from: event.fromPresetId,
            to: event.toPresetId,
            duration: event.commitDurationMs,
        });

        setZoomPreset(event.toPresetId);

        // Update Debug HUD
        setDebugState(createZoomCommitUpdate(event));
    }, []);

    const handleSelectionChange = useCallback((event: SelectionEvent) => {
        console.log('[NativeReader] SelectionChange:', event);

        // Update Debug HUD
        setDebugState(prev => ({
            ...prev,
            eventCount: prev.eventCount + 1,
            lastEventType: 'onSelectionChange',
        }));
    }, []);

    const handleError = useCallback((event: ErrorEvent) => {
        console.error('[NativeReader] Error:', event);

        // Update Debug HUD
        setDebugState(createErrorUpdate(event));
    }, []);

    const handleAnchorUpdate = useCallback((event: { v: 1; anchor: Anchor }) => {
        progress.saveAnchor(event.anchor.charOffset, event.anchor.zoomPresetId, text);

        // Update Debug HUD
        setDebugState(prev => ({
            ...prev,
            eventCount: prev.eventCount + 1,
            lastEventType: 'onAnchorUpdate',
        }));
    }, [progress, text]);

    // Handle scroll events (when native emits them)
    const handleScroll = useCallback((event: any) => {
        setDebugState(createScrollUpdate(event));
    }, []);

    // Handle gesture state events (when native emits them)
    const handleGestureState = useCallback((event: any) => {
        setDebugState(createGestureStateUpdate(event));
    }, []);

    // Handle debug metrics event
    const handleDebugMetrics = useCallback((event: any) => {
        setDebugState(createMetricsUpdate(event));
    }, []);

    // If native not available, return null (triggers legacy reader in RisaleReaderEntry)
    if (!nativeStatus.ok) {
        console.log(`[NativeReaderScreen] Native not available: ${nativeStatus.reason}`);
        return null;
    }

    // Loading state
    if (isLoading || !text) {
        return (
            <SafeAreaView style={styles.container}>
                <ReaderDebugBanner
                    isNativeActive={nativeStatus.ok}
                    reason={nativeStatus.reason}
                    viewName={nativeStatus.name}
                />
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ReaderDebugBanner
                isNativeActive={nativeStatus.ok}
                reason={nativeStatus.reason}
                viewName={nativeStatus.name}
            />

            {/* Native Reader View */}
            <NativeReaderView
                ref={nativeReaderRef}
                style={styles.reader}
                text={text}
                bookId={bookId}
                sectionUid={effectiveSectionId}
                zoomPresetId={zoomPreset}
                onWordTap={handleWordTap}
                onZoomCommit={handleZoomCommit}
                onSelectionChange={handleSelectionChange}
                onError={handleError}
                onAnchorUpdate={handleAnchorUpdate}
                onDebugMetrics={handleDebugMetrics}
            />

            {/* PHASE 3: Selected word overlay with rect highlight */}
            <SelectedWordOverlay
                lastWordTap={debugState.lastWordTap}
                offsetY={debugState.offsetY}
                overlayScale={debugState.overlayScale}
            />

            {/* PHASE 1: Enhanced Debug HUD */}
            <NativeReaderDebugHUD state={debugState} />

            {/* DEV: Confirm native view is mounted */}
            {__DEV__ && (
                <View style={styles.mountedBanner}>
                    <Text style={styles.mountedText}>
                        Native view mounted ✓ | Chars: {text.length} | Mode: {debugState.gestureMode}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fffbf0',
    },
    reader: {
        flex: 1,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
    },
    mountedBanner: {
        backgroundColor: '#10b981',
        paddingVertical: 4,
        alignItems: 'center',
    },
    mountedText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default NativeReaderScreen;
