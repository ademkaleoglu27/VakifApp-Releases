/**
 * Reader Bridge v1.0
 * 
 * TypeScript interfaces for Native Reader Engine communication.
 * See docs/READER_CONTRACT.md for full specification.
 */

// ═══════════════════════════════════════════════════════════════
// ANCHOR SCHEMA
// ═══════════════════════════════════════════════════════════════

export interface Anchor {
    bookId: string;
    sectionUid: string;
    charOffset: number;
    timestamp: number;
    zoomPresetId: ZoomPresetId;
    /** P4: Context checksum for deterministic restore (32 char hash) */
    contextChecksum?: string;
}

// ═══════════════════════════════════════════════════════════════
// ZOOM PRESETS
// ═══════════════════════════════════════════════════════════════

export type ZoomPresetId = 'XS' | 'SM' | 'MD' | 'LG' | 'XL';

export interface ZoomPreset {
    id: ZoomPresetId;
    fontSize: number;
    lineHeight: number;
    paragraphGap: number;
    arabicExtraPadding: number;
    /** P0: Line spacing multiplier for Android setLineSpacing */
    lineSpacingMultiplier: number;
}

export const ZOOM_PRESETS: Record<ZoomPresetId, ZoomPreset> = {
    XS: { id: 'XS', fontSize: 13, lineHeight: 15, paragraphGap: 2, arabicExtraPadding: 2, lineSpacingMultiplier: 1.15 },
    SM: { id: 'SM', fontSize: 15, lineHeight: 18, paragraphGap: 3, arabicExtraPadding: 2, lineSpacingMultiplier: 1.18 },
    MD: { id: 'MD', fontSize: 17, lineHeight: 20, paragraphGap: 4, arabicExtraPadding: 2, lineSpacingMultiplier: 1.20 },
    LG: { id: 'LG', fontSize: 20, lineHeight: 24, paragraphGap: 5, arabicExtraPadding: 2, lineSpacingMultiplier: 1.22 },
    XL: { id: 'XL', fontSize: 24, lineHeight: 30, paragraphGap: 6, arabicExtraPadding: 2, lineSpacingMultiplier: 1.25 },
};

export const DEFAULT_ZOOM_PRESET: ZoomPresetId = 'MD';

// ═══════════════════════════════════════════════════════════════
// CONTENT MARKERS
// ═══════════════════════════════════════════════════════════════

export type MarkerType = 'AYET' | 'FN' | 'HASHIYE' | 'LINK';

export interface Marker {
    type: MarkerType;
    id: string;
    startOffset: number;
    endOffset: number;
    attributes: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// COMMANDS (RN → Native)
// ═══════════════════════════════════════════════════════════════

export type ReaderCommandType =
    | 'SET_CONTENT'
    | 'SET_ZOOM_PRESET'
    | 'SCROLL_TO_ANCHOR'
    | 'CLEAR_SELECTION';

export interface SetContentCommand {
    type: 'SET_CONTENT';
    text: string;
    markers: Marker[];
    anchor?: Anchor;
}

export interface SetZoomPresetCommand {
    type: 'SET_ZOOM_PRESET';
    presetId: ZoomPresetId;
}

export interface ScrollToAnchorCommand {
    type: 'SCROLL_TO_ANCHOR';
    anchor: Anchor;
}

export interface ClearSelectionCommand {
    type: 'CLEAR_SELECTION';
}

export type ReaderCommand =
    | SetContentCommand
    | SetZoomPresetCommand
    | ScrollToAnchorCommand
    | ClearSelectionCommand;

// ═══════════════════════════════════════════════════════════════
// EVENTS (Native → RN)
// ═══════════════════════════════════════════════════════════════

export interface WordTapEvent {
    v: 1;
    wordRaw: string;
    wordNormalized: string;
    rect: { x: number; y: number; w: number; h: number };
    /** P2: Start offset in text (global, not chunk-local) */
    startOffset: number;
    /** P2: End offset in text (global, not chunk-local) */
    endOffset: number;
    contextSnippet: string;
    anchor: Anchor;
}

export interface SelectionEvent {
    v: 1;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    anchor: Anchor;
}

export interface ZoomCommitEvent {
    v: 1;
    fromPresetId: ZoomPresetId;
    toPresetId: ZoomPresetId;
    commitDurationMs: number;
}

export interface ScrollEvent {
    v: 1;
    charOffset: number;
    scrollY: number;
    contentHeight: number;
}

export interface AnchorEvent {
    v: 1;
    anchor: Anchor;
}

export interface MarkerTapEvent {
    v: 1;
    marker: Marker;
}

export interface ErrorEvent {
    v: 1;
    code: string;
    message: string;
    fatal: boolean;
}

export interface DebugMetricsEvent {
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
    // CLIP DIAGNOSTIC fields
    presetId: string;
    lineHeightPx: number;
    measuredMaxRunPx: number;
    deltaPx: number;
    clipDiagSeverity: string; // 'NONE' | 'SUSPECT' | 'CONFIRMED'
    // CLIP GUARD fields
    clipFixApplied: boolean;
    clipPadTopPx: number;
    clipPadBottomPx: number;
}

// ═══════════════════════════════════════════════════════════════
// EVENT UNION
// ═══════════════════════════════════════════════════════════════

export type ReaderEventType =
    | 'onWordTap'
    | 'onSelectionChange'
    | 'onZoomCommit'
    | 'onScrollPosition'
    | 'onAnchorUpdate'
    | 'onMarkerTap'
    | 'onError'
    | 'onDebugMetrics'; // DIAGNOSTIC

export interface ReaderEventMap {
    onWordTap: WordTapEvent;
    onSelectionChange: SelectionEvent;
    onZoomCommit: ZoomCommitEvent;
    onScrollPosition: ScrollEvent;
    onAnchorUpdate: AnchorEvent;
    onMarkerTap: MarkerTapEvent;
    onError: ErrorEvent;
    onDebugMetrics: DebugMetricsEvent;
}
