/**
 * NativeReaderView v1.1
 * 
 * React Native wrapper for Android NativeReaderView.
 * Uses NativeAvailability for safe fallback when not available.
 */

import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
    requireNativeComponent,
    UIManager,
    findNodeHandle,
    Platform,
    ViewStyle,
    NativeSyntheticEvent,
    View,
    Text,
} from 'react-native';
import {
    getNativeReaderStatus,
    isNativeReaderAvailable,
    NATIVE_READER_VIEW_NAME
} from './NativeAvailability';
import type {
    Anchor,
    ZoomPresetId,
    Marker,
    WordTapEvent,
    SelectionEvent,
    ZoomCommitEvent,
    ScrollEvent,
    AnchorEvent,
    MarkerTapEvent,
    ErrorEvent,
} from './ReaderBridge';

// ═══════════════════════════════════════════════════════════════
// NATIVE COMPONENT INTERFACE
// ═══════════════════════════════════════════════════════════════

interface NativeReaderViewProps {
    style?: ViewStyle;

    // Content
    text: string;
    markers?: Marker[];

    // IDs for anchor
    bookId?: string;
    sectionUid?: string;

    // Settings
    zoomPresetId?: ZoomPresetId;
    initialAnchor?: Anchor;

    // Events
    onWordTap?: (event: NativeSyntheticEvent<WordTapEvent>) => void;
    onSelectionChange?: (event: NativeSyntheticEvent<SelectionEvent>) => void;
    onZoomCommit?: (event: NativeSyntheticEvent<ZoomCommitEvent>) => void;
    onScrollPosition?: (event: NativeSyntheticEvent<ScrollEvent>) => void;
    onAnchorUpdate?: (event: NativeSyntheticEvent<AnchorEvent>) => void;
    onMarkerTap?: (event: NativeSyntheticEvent<MarkerTapEvent>) => void;
    onError?: (event: NativeSyntheticEvent<ErrorEvent>) => void;
    onGestureState?: (event: NativeSyntheticEvent<any>) => void;
    onDebugMetrics?: (event: NativeSyntheticEvent<any>) => void;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export interface NativeReaderViewRef {
    setZoomPreset: (presetId: ZoomPresetId) => void;
    scrollToAnchor: (anchor: Anchor) => void;
    clearSelection: () => void;
}

export interface NativeReaderViewPublicProps {
    style?: ViewStyle;

    // Content
    text: string;
    markers?: Marker[];

    // IDs for anchor
    bookId?: string;
    sectionUid?: string;

    // Settings
    zoomPresetId?: ZoomPresetId;
    initialAnchor?: Anchor;

    // Event handlers (unwrapped)
    onWordTap?: (event: WordTapEvent) => void;
    onSelectionChange?: (event: SelectionEvent) => void;
    onZoomCommit?: (event: ZoomCommitEvent) => void;
    onScrollPosition?: (event: ScrollEvent) => void;
    onAnchorUpdate?: (event: AnchorEvent) => void;
    onMarkerTap?: (event: MarkerTapEvent) => void;
    onError?: (event: ErrorEvent) => void;
    onGestureState?: (event: any) => void;
    onDebugMetrics?: (event: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// NATIVE COMPONENT (SAFE REQUIRE)
// ═══════════════════════════════════════════════════════════════

// Only require if available - prevents bubblingEventTypes crash
let NativeReaderViewNative: React.ComponentType<NativeReaderViewProps> | null = null;

// Check availability BEFORE calling requireNativeComponent
const nativeStatus = getNativeReaderStatus();
if (nativeStatus.ok) {
    try {
        NativeReaderViewNative = requireNativeComponent<NativeReaderViewProps>(NATIVE_READER_VIEW_NAME);
        console.log('[NativeReaderView] Native component loaded successfully');
    } catch (e) {
        console.warn('[NativeReaderView] Failed to load native component:', e);
        NativeReaderViewNative = null;
    }
} else {
    console.log(`[NativeReaderView] Skipping native component: ${nativeStatus.reason}`);
}

// ═══════════════════════════════════════════════════════════════
// WRAPPER COMPONENT
// ═══════════════════════════════════════════════════════════════

export const NativeReaderView = forwardRef<NativeReaderViewRef, NativeReaderViewPublicProps>(
    (props, ref) => {
        const nativeRef = useRef<any>(null);

        // Imperative methods
        useImperativeHandle(ref, () => ({
            setZoomPreset: (presetId: ZoomPresetId) => {
                if (Platform.OS !== 'android' || !NativeReaderViewNative) return;
                const handle = findNodeHandle(nativeRef.current);
                if (handle) {
                    UIManager.dispatchViewManagerCommand(
                        handle,
                        'setZoomPreset',
                        [presetId]
                    );
                }
            },
            scrollToAnchor: (anchor: Anchor) => {
                if (Platform.OS !== 'android' || !NativeReaderViewNative) return;
                const handle = findNodeHandle(nativeRef.current);
                if (handle) {
                    UIManager.dispatchViewManagerCommand(
                        handle,
                        'scrollToAnchor',
                        [JSON.stringify(anchor)]
                    );
                }
            },
            clearSelection: () => {
                if (Platform.OS !== 'android' || !NativeReaderViewNative) return;
                const handle = findNodeHandle(nativeRef.current);
                if (handle) {
                    UIManager.dispatchViewManagerCommand(
                        handle,
                        'clearSelection',
                        []
                    );
                }
            },
        }));

        // Event unwrappers
        const handleWordTap = useCallback((e: NativeSyntheticEvent<WordTapEvent>) => {
            props.onWordTap?.(e.nativeEvent);
        }, [props.onWordTap]);

        const handleSelectionChange = useCallback((e: NativeSyntheticEvent<SelectionEvent>) => {
            props.onSelectionChange?.(e.nativeEvent);
        }, [props.onSelectionChange]);

        const handleZoomCommit = useCallback((e: NativeSyntheticEvent<ZoomCommitEvent>) => {
            props.onZoomCommit?.(e.nativeEvent);
        }, [props.onZoomCommit]);

        const handleScrollPosition = useCallback((e: NativeSyntheticEvent<ScrollEvent>) => {
            props.onScrollPosition?.(e.nativeEvent);
        }, [props.onScrollPosition]);

        const handleAnchorUpdate = useCallback((e: NativeSyntheticEvent<AnchorEvent>) => {
            props.onAnchorUpdate?.(e.nativeEvent);
        }, [props.onAnchorUpdate]);

        const handleMarkerTap = useCallback((e: NativeSyntheticEvent<MarkerTapEvent>) => {
            props.onMarkerTap?.(e.nativeEvent);
        }, [props.onMarkerTap]);

        const handleError = useCallback((e: NativeSyntheticEvent<ErrorEvent>) => {
            props.onError?.(e.nativeEvent);
        }, [props.onError]);

        const handleGestureState = useCallback((e: NativeSyntheticEvent<any>) => {
            props.onGestureState?.(e.nativeEvent);
        }, [props.onGestureState]);

        const handleDebugMetrics = useCallback((e: NativeSyntheticEvent<any>) => {
            props.onDebugMetrics?.(e.nativeEvent);
        }, [props.onDebugMetrics]);

        // Fallback if not available
        if (!NativeReaderViewNative) {
            // Return null - caller should handle fallback to legacy reader
            return null;
        }

        return (
            <NativeReaderViewNative
                ref={nativeRef}
                style={props.style}
                text={props.text}
                markers={props.markers}
                bookId={props.bookId}
                sectionUid={props.sectionUid}
                zoomPresetId={props.zoomPresetId}
                initialAnchor={props.initialAnchor}
                onWordTap={handleWordTap}
                onSelectionChange={handleSelectionChange}
                onZoomCommit={handleZoomCommit}
                onScrollPosition={handleScrollPosition}
                onAnchorUpdate={handleAnchorUpdate}
                onMarkerTap={handleMarkerTap}
                onError={handleError}
                onGestureState={handleGestureState}
                onDebugMetrics={handleDebugMetrics}
            />
        );
    }
);

NativeReaderView.displayName = 'NativeReaderView';
