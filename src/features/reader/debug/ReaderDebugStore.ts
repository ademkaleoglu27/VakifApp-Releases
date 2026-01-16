/**
 * ReaderDebugStore.ts v1.0
 * 
 * Centralized debug state for Native Reader HUD.
 * All native events update this store; HUD reads from it.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type GestureMode =
    | 'IDLE'
    | 'SCROLL_1P'
    | 'PINCH_READY'
    | 'PINCH_ACTIVE'
    | 'COMMITTING';

export type ScrollState =
    | 'IDLE'
    | 'DRAGGING'
    | 'MOMENTUM';

export type HitTestSource =
    | 'direct'
    | 'nearest'
    | 'stale_fallback'
    | 'unknown';

export interface WordTapDebugInfo {
    word: string;
    wordNormalized: string;
    tokenIndex: number;
    rectX: number;
    rectY: number;
    rectW: number;
    rectH: number;
    startOffset: number;
    endOffset: number;
    offsetY_atTapDown: number;
    scale_atTapDown: number;
    layoutVersion: number;
    candidateCount: number;
    selectedTokenDistancePx: number;
    hitTestSource: HitTestSource;
    timestamp: number;
}

export interface TextMetrics {
    baseFontSize: number;
    appliedFontSize: number;
    appliedLineHeight: number;
    paragraphSpacing: number;
    pageMarginY: number;
}

export interface PopupMetrics {
    popupFontScale: number;
    popupMaxWidthPx: number;
    popupX: number;
    popupY: number;
    popupRepositionCount: number;
}

export interface ReaderDebugState {
    // Native status
    nativeEnabled: boolean;

    // Gesture
    gestureMode: GestureMode;
    pointerCount: number;
    pinchReadyLatencyMs: number;
    pinchActivationLatencyMs: number;

    // Zoom
    zoomPresetId: string;
    overlayScale: number;
    committedScale: number;
    commitDurationMs: number;
    commitCanceledCount: number;

    // Scroll
    offsetY: number;
    scrollState: ScrollState;
    scrollVelocityY: number;

    // Layout
    layoutVersion: number;

    // Word tap
    lastWordTap: WordTapDebugInfo | null;

    // Typography metrics
    textMetrics: TextMetrics;

    // Popup metrics
    popupMetrics: PopupMetrics;

    // Validation
    eventMismatchFlag: boolean;
    eventCount: number;
    lastEventType: string;
    lastError: string;
}

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

export const initialDebugState: ReaderDebugState = {
    nativeEnabled: false,

    gestureMode: 'IDLE',
    pointerCount: 0,
    pinchReadyLatencyMs: 0,
    pinchActivationLatencyMs: 0,

    zoomPresetId: 'Z2',
    overlayScale: 1.0,
    committedScale: 1.0,
    commitDurationMs: 0,
    commitCanceledCount: 0,

    offsetY: 0,
    scrollState: 'IDLE',
    scrollVelocityY: 0,

    layoutVersion: 0,

    lastWordTap: null,

    textMetrics: {
        baseFontSize: 18,
        appliedFontSize: 18,
        appliedLineHeight: 28,
        paragraphSpacing: 16,
        pageMarginY: 32,
    },

    popupMetrics: {
        popupFontScale: 1.0,
        popupMaxWidthPx: 320,
        popupX: 0,
        popupY: 0,
        popupRepositionCount: 0,
    },

    eventMismatchFlag: false,
    eventCount: 0,
    lastEventType: '-',
    lastError: '-',
};

// ═══════════════════════════════════════════════════════════════
// UPDATE HELPERS
// ═══════════════════════════════════════════════════════════════

export type DebugStateUpdater = (prev: ReaderDebugState) => ReaderDebugState;

/**
 * Create an updater for word tap events
 */
export function createWordTapUpdate(event: any): DebugStateUpdater {
    return (prev) => {
        // Validate required fields
        const required = ['wordRaw', 'startOffset'];
        const missing = required.filter(f => event[f] === undefined);
        const mismatch = missing.length > 0;

        return {
            ...prev,
            lastWordTap: {
                word: event.wordRaw ?? '-',
                wordNormalized: event.wordNormalized ?? '-',
                tokenIndex: event.tokenIndex ?? -1,
                rectX: event.rectX ?? 0,
                rectY: event.rectY ?? 0,
                rectW: event.rectW ?? 0,
                rectH: event.rectH ?? 0,
                startOffset: event.startOffset ?? 0,
                endOffset: event.endOffset ?? 0,
                offsetY_atTapDown: event.offsetY_atTapDown ?? prev.offsetY,
                scale_atTapDown: event.scale_atTapDown ?? prev.overlayScale,
                layoutVersion: event.layoutVersion ?? prev.layoutVersion,
                candidateCount: event.candidateCount ?? 1,
                selectedTokenDistancePx: event.selectedTokenDistancePx ?? 0,
                hitTestSource: event.hitTestSource ?? 'unknown',
                timestamp: Date.now(),
            },
            eventMismatchFlag: mismatch || prev.eventMismatchFlag,
            eventCount: prev.eventCount + 1,
            lastEventType: 'onWordTap',
        };
    };
}

/**
 * Create an updater for zoom commit events
 */
export function createZoomCommitUpdate(event: any): DebugStateUpdater {
    return (prev) => ({
        ...prev,
        zoomPresetId: event.toPresetId ?? prev.zoomPresetId,
        committedScale: event.committedScale ?? 1.0,
        commitDurationMs: event.commitDurationMs ?? 0,
        commitCanceledCount: event.commitCanceledCount ?? prev.commitCanceledCount,
        overlayScale: 1.0, // Reset after commit
        gestureMode: 'IDLE',
        eventCount: prev.eventCount + 1,
        lastEventType: 'onZoomCommit',
    });
}

/**
 * Create an updater for gesture state events
 */
export function createGestureStateUpdate(event: any): DebugStateUpdater {
    return (prev) => ({
        ...prev,
        gestureMode: event.gestureMode ?? prev.gestureMode,
        pointerCount: event.pointerCount ?? prev.pointerCount,
        overlayScale: event.overlayScale ?? prev.overlayScale,
        pinchReadyLatencyMs: event.pinchReadyLatencyMs ?? prev.pinchReadyLatencyMs,
        pinchActivationLatencyMs: event.pinchActivationLatencyMs ?? prev.pinchActivationLatencyMs,
        eventCount: prev.eventCount + 1,
        lastEventType: 'onGestureState',
    });
}

/**
 * Create an updater for scroll events
 */
export function createScrollUpdate(event: any): DebugStateUpdater {
    return (prev) => ({
        ...prev,
        offsetY: event.offsetY ?? prev.offsetY,
        scrollVelocityY: event.velocityY ?? prev.scrollVelocityY,
        scrollState: event.scrollState ?? prev.scrollState,
        eventCount: prev.eventCount + 1,
        lastEventType: 'onScroll',
    });
}

/**
 * Create an updater for error events
 */
export function createErrorUpdate(event: any): DebugStateUpdater {
    return (prev) => ({
        ...prev,
        lastError: event.message ?? 'Unknown error',
        eventMismatchFlag: true,
        eventCount: prev.eventCount + 1,
        lastEventType: 'onError',
    });
}
