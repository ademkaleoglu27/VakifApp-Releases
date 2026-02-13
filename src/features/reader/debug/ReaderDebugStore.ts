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

export type ClipDiagSeverity = 'NONE' | 'SUSPECT' | 'CONFIRMED';

export interface ClipDiag {
    flag: 0 | 1;
    severity: ClipDiagSeverity;
    presetId: string;
    lineHeightPx: number;
    measuredMaxRunPx: number;
    deltaPx: number;
    clipFixApplied: boolean;
    clipPadTopPx: number;
    clipPadBottomPx: number;
    lastSampleAtMs: number;
    sampleCount: number;
    // CLIP AUTO-FIX V2: Expansion metrics
    expansionTopPx: number;
    expansionBottomPx: number;
    expansionTotalPx: number;
    baseMeasuredHeight: number;
    finalMeasuredHeight: number;
    clipFixEnabled: boolean;
    // V3: Safe line height metrics
    baseLinePx: number;
    arabicLinePx: number;
    finalLineHeightPx: number;
    safetyPx: number;
    arabicSpanMetricAffecting: boolean;
    // V3.3: Span-based fix mode
    clipLineMetricsMode: 'NONE' | 'SPAN';
}

// CONTINUITY GUARD: Gap/overlap detection
export type ContinuityStatus = 'OK' | 'GAP' | 'OVERLAP' | 'EMPTY';

export interface ContinuityDiag {
    status: ContinuityStatus;
    totalChars: number;
    coveredStart: number;
    coveredEnd: number;
    gapCount: number;
    overlapCount: number;
    maxGapSize: number;
    firstGapStart: number;
    firstGapEnd: number;
    chunkCountVisible: number;
    chunkCountTotal: number;
}

// LAYOUT DIAGNOSTICS (Task 1)
export interface LayoutDiagItem {
    chunkIndex: number;
    offsetGap: number;
    measuredHeight: number;
    layoutHeight: number;
    heightDelta: number;
    flags: string;
}

export interface LayoutDiag {
    totalOffsetGap: number;
    maxOffsetGap: number;
    offsetGapDetected: boolean;
    heightDeltaDetected: boolean;
    // V3.3: Map Mismatch
    mapMismatchPx?: number;
    finalContentHeight?: number;
    mapMode?: string;
    items: LayoutDiagItem[];
}

export type HitTestSourceLegacy =
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

export interface DebugMetrics {
    fontSize: number;
    lineSpacingMultiplier: number;
    arabicPadding: number;
    nativeAscent: number;
    nativeDescent: number;
    nativeTop: number;
    nativeBottom: number;
    computedLineHeightPx: number;
    measuredArabicWord: string;
    measuredArabicHeightPx: number;
    totalPaintHeightPx: number;
    clipRisk: boolean;
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

    // DIAGNOSTIC: Native Rendering Metrics
    debugMetrics: DebugMetrics | null;

    // HAYRAT GATE: Interaction Guard
    lugatGate: 'OPEN' | 'CLOSED';
    lastGateReason: 'SCROLL' | 'MOMENTUM' | 'PINCH' | 'SETTLING' | 'NONE';
    settleUntilMs: number;
    gateRejectCount: number;

    // CLIP DIAGNOSTIC
    clipDiag: ClipDiag;

    // CONTINUITY GUARD
    continuityDiag: ContinuityDiag;

    // LAYOUT DIAGNOSTICS
    layoutDiag: LayoutDiag;

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

    debugMetrics: null,

    // HAYRAT GATE
    lugatGate: 'OPEN',
    lastGateReason: 'NONE',
    settleUntilMs: 0,
    gateRejectCount: 0,

    // CLIP DIAGNOSTIC
    clipDiag: {
        flag: 0,
        severity: 'NONE',
        presetId: 'MD',
        lineHeightPx: 0,
        measuredMaxRunPx: 0,
        deltaPx: 0,
        clipFixApplied: false,
        clipPadTopPx: 0,
        clipPadBottomPx: 0,
        lastSampleAtMs: 0,
        sampleCount: 0,
        // CLIP AUTO-FIX V2
        expansionTopPx: 0,
        expansionBottomPx: 0,
        expansionTotalPx: 0,
        baseMeasuredHeight: 0,
        finalMeasuredHeight: 0,
        clipFixEnabled: true,
        // V3: Safe line height metrics
        baseLinePx: 0,
        arabicLinePx: 0,
        finalLineHeightPx: 0,
        safetyPx: 0,
        arabicSpanMetricAffecting: false,
        clipLineMetricsMode: 'NONE',
    },

    // CONTINUITY GUARD
    continuityDiag: {
        status: 'OK' as ContinuityStatus,
        totalChars: 0,
        coveredStart: 0,
        coveredEnd: 0,
        gapCount: 0,
        overlapCount: 0,
        maxGapSize: 0,
        firstGapStart: 0,
        firstGapEnd: 0,
        chunkCountVisible: 0,
        chunkCountTotal: 0,
    },

    // LAYOUT DIAGNOSTICS
    layoutDiag: {
        totalOffsetGap: 0,
        maxOffsetGap: 0,
        offsetGapDetected: false,
        heightDeltaDetected: false,
        items: [],
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
 * Create an updater for debug metrics events
 */
export function createMetricsUpdate(event: any): DebugStateUpdater {
    return (prev) => {
        // Calculate clip diagnostic severity from native deltaPx
        const deltaPx = event.deltaPx ?? 0;
        const clipFixApplied = event.clipFixApplied ?? false;

        // Severity: NONE | SUSPECT | CONFIRMED
        let severity: ClipDiagSeverity = 'NONE';
        let flag: 0 | 1 = 0;
        if (deltaPx >= 2) {
            severity = 'CONFIRMED';
            flag = 1;
        } else if (deltaPx > 0) {
            severity = 'SUSPECT';
            flag = 1;
        }

        return {
            ...prev,
            debugMetrics: {
                fontSize: event.fontSize ?? 0,
                lineSpacingMultiplier: event.lineSpacingMultiplier ?? 0,
                arabicPadding: event.arabicPadding ?? 0,
                nativeAscent: event.nativeAscent ?? 0,
                nativeDescent: event.nativeDescent ?? 0,
                nativeTop: event.nativeTop ?? 0,
                nativeBottom: event.nativeBottom ?? 0,
                computedLineHeightPx: event.computedLineHeightPx ?? 0,
                measuredArabicWord: event.measuredArabicWord ?? '-',
                measuredArabicHeightPx: event.measuredArabicHeightPx ?? 0,
                totalPaintHeightPx: event.totalPaintHeightPx ?? 0,
                clipRisk: event.clipRisk ?? false,
            },
            clipDiag: {
                flag,
                severity,
                presetId: event.presetId ?? prev.clipDiag.presetId,
                lineHeightPx: event.lineHeightPx ?? event.computedLineHeightPx ?? 0,
                measuredMaxRunPx: event.measuredMaxRunPx ?? 0,
                deltaPx,
                clipFixApplied,
                clipPadTopPx: event.clipPadTopPx ?? 0,
                clipPadBottomPx: event.clipPadBottomPx ?? 0,
                lastSampleAtMs: Date.now(),
                sampleCount: prev.clipDiag.sampleCount + 1,
                // CLIP AUTO-FIX V2: Expansion metrics
                expansionTopPx: event.expansionTopPx ?? 0,
                expansionBottomPx: event.expansionBottomPx ?? 0,
                expansionTotalPx: event.expansionTotalPx ?? 0,
                baseMeasuredHeight: event.baseMeasuredHeight ?? 0,
                finalMeasuredHeight: event.finalMeasuredHeight ?? 0,
                clipFixEnabled: event.clipFixEnabled ?? true,
                // V3: Safe line height metrics
                baseLinePx: event.baseLinePx ?? 0,
                arabicLinePx: event.arabicLinePx ?? 0,
                finalLineHeightPx: event.finalLineHeightPx ?? 0,
                safetyPx: event.safetyPx ?? 0,
                arabicSpanMetricAffecting: event.arabicSpanMetricAffecting ?? false,
                clipLineMetricsMode: event.clipLineMetricsMode ?? 'NONE',
            },
            // CONTINUITY GUARD
            continuityDiag: {
                status: (event.continuityStatus ?? 'OK') as ContinuityStatus,
                totalChars: event.continuityTotalChars ?? 0,
                coveredStart: event.continuityCoveredStart ?? 0,
                coveredEnd: event.continuityCoveredEnd ?? 0,
                gapCount: event.continuityGapCount ?? 0,
                overlapCount: event.continuityOverlapCount ?? 0,
                maxGapSize: event.continuityMaxGapSize ?? 0,
                firstGapStart: event.continuityFirstGapStart ?? 0,
                firstGapEnd: event.continuityFirstGapEnd ?? 0,
                chunkCountVisible: event.chunkCountVisible ?? 0,
                chunkCountTotal: event.chunkCountTotal ?? 0,
            },
            // LAYOUT DIAGNOSTICS
            layoutDiag: event.layoutDiag ? {
                totalOffsetGap: event.layoutDiag.totalOffsetGap ?? 0,
                maxOffsetGap: event.layoutDiag.maxOffsetGap ?? 0,
                offsetGapDetected: event.layoutDiag.offsetGapDetected ?? false,
                heightDeltaDetected: event.layoutDiag.heightDeltaDetected ?? false,
                mapMismatchPx: event.layoutDiag.mapMismatchPx ?? 0,
                finalContentHeight: event.layoutDiag.finalContentHeight ?? 0,
                mapMode: event.layoutDiag.mapMode ?? 'PRE',
                items: event.layoutDiag.items ?? [],
            } : prev.layoutDiag,
            eventCount: prev.eventCount + 1,
            lastEventType: 'onDebugMetrics',
        };
    };
}

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

        // HAYRAT GATE: Settle after zoom commit
        lugatGate: 'CLOSED', // Briefly closed while settling
        lastGateReason: 'SETTLING',
        settleUntilMs: Date.now() + 100, // 100ms settle time
    });
}

/**
 * Create an updater for gesture state events
 */
export function createGestureStateUpdate(event: any): DebugStateUpdater {
    return (prev) => {
        const newGestureMode = event.gestureMode ?? prev.gestureMode;

        // HAYRAT GATE: Close if pinching or active
        const isPinching = newGestureMode === 'PINCH_ACTIVE' || newGestureMode === 'PINCH_READY';
        const gateState = isPinching ? 'CLOSED' : prev.lugatGate; // Don't auto-open here, wait for settle
        const gateReason = isPinching ? 'PINCH' : prev.lastGateReason;

        return {
            ...prev,
            gestureMode: newGestureMode,
            pointerCount: event.pointerCount ?? prev.pointerCount,
            overlayScale: event.overlayScale ?? prev.overlayScale,
            pinchReadyLatencyMs: event.pinchReadyLatencyMs ?? prev.pinchReadyLatencyMs,
            pinchActivationLatencyMs: event.pinchActivationLatencyMs ?? prev.pinchActivationLatencyMs,
            eventCount: prev.eventCount + 1,
            lastEventType: 'onGestureState',

            lugatGate: gateState,
            lastGateReason: gateReason,
        };
    }
}

/**
 * Create an updater for scroll events
 */
export function createScrollUpdate(event: any): DebugStateUpdater {
    return (prev) => {
        const newScrollState = event.scrollState ?? prev.scrollState;

        // HAYRAT GATE: Close immediately on drag/momentum
        const isMoving = newScrollState === 'DRAGGING' || newScrollState === 'MOMENTUM';
        let gateState = prev.lugatGate;
        let gateReason = prev.lastGateReason;
        let settleTime = prev.settleUntilMs;

        if (isMoving) {
            gateState = 'CLOSED';
            gateReason = newScrollState === 'DRAGGING' ? 'SCROLL' : 'MOMENTUM';
            settleTime = Date.now() + 150; // Extend settle time while moving
        } else if (prev.scrollState !== 'IDLE' && newScrollState === 'IDLE') {
            // Just became IDLE
            gateState = 'CLOSED'; // Keep closed for settle duration
            gateReason = 'SETTLING';
            settleTime = Date.now() + 100; // 100ms settle
        }

        return {
            ...prev,
            offsetY: event.offsetY ?? prev.offsetY,
            scrollVelocityY: event.velocityY ?? prev.scrollVelocityY,
            scrollState: newScrollState,
            eventCount: prev.eventCount + 1,
            lastEventType: 'onScroll',

            lugatGate: gateState as 'OPEN' | 'CLOSED',
            lastGateReason: gateReason as any,
            settleUntilMs: settleTime,
        };
    }
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

/**
 * Check if gate should open (Time Tick)
 */
export function createGateCheckUpdate(): DebugStateUpdater {
    return (prev) => {
        if (prev.lugatGate === 'OPEN') return prev; // Already open

        const now = Date.now();
        if (now >= prev.settleUntilMs) {
            // Settle time passed, and we are not in active motion
            const isSafe = prev.scrollState === 'IDLE' &&
                prev.gestureMode !== 'PINCH_ACTIVE' &&
                prev.gestureMode !== 'PINCH_READY';

            if (isSafe) {
                return {
                    ...prev,
                    lugatGate: 'OPEN',
                    lastGateReason: 'NONE',
                };
            }
        }
        return prev;
    };
}
