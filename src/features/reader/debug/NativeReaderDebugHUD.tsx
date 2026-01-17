/**
 * NativeReaderDebugHUD.tsx v1.0
 * 
 * Enhanced Debug HUD showing all stability metrics.
 * Shows gesture state, zoom, scroll, hit-test, and validation info.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import type { ReaderDebugState } from './ReaderDebugStore';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface DebugHUDProps {
    state: ReaderDebugState;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const NativeReaderDebugHUD: React.FC<DebugHUDProps> = ({ state }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'main' | 'tap' | 'metrics'>('main');

    // Only show in DEV
    if (!__DEV__) return null;

    const toggleExpanded = () => setIsExpanded(!isExpanded);

    // Collapsed view
    if (!isExpanded) {
        return (
            <Pressable style={styles.collapsedContainer} onPress={toggleExpanded}>
                <Text style={styles.collapsedText}>
                    🔧 {state.gestureMode} | Z:{state.zoomPresetId} | E:{state.eventCount}
                </Text>
            </Pressable>
        );
    }

    // Main tab content
    const MainTab = () => {
        // Helper for CLIP severity color
        const getClipColor = (severity: string): string => {
            switch (severity) {
                case 'CONFIRMED': return '#ef4444';
                case 'SUSPECT': return '#f59e0b';
                default: return '#10b981';
            }
        };

        const clipDiag = state.clipDiag;
        const clipBgColor = clipDiag?.severity === 'CONFIRMED' ? '#7f1d1d' :
            clipDiag?.severity === 'SUSPECT' ? '#713f12' : undefined;

        return (
            <>
                {/* CLIP GUARD PANEL - Top of Main Tab */}
                {clipDiag && clipDiag.severity !== 'NONE' && (
                    <View style={{
                        backgroundColor: clipBgColor,
                        marginBottom: 4,
                        padding: 2,
                        borderRadius: 2,
                    }}>
                        <Text style={styles.clipRow}>
                            CLIP: {clipDiag.severity}  Δ{clipDiag.deltaPx}px  LH:{clipDiag.lineHeightPx}px
                        </Text>
                        <Text style={styles.clipRow}>
                            MX:{clipDiag.measuredMaxRunPx}px  Fix:{clipDiag.clipFixEnabled ? 'ON' : 'OFF'}
                        </Text>
                        {clipDiag.expansionTotalPx > 0 && (
                            <Text style={[styles.clipRow, { color: '#10b981' }]}>
                                Expand: +{clipDiag.expansionTotalPx}px ({clipDiag.expansionTopPx}+{clipDiag.expansionBottomPx})
                            </Text>
                        )}
                        {clipDiag.finalMeasuredHeight > 0 && (
                            <Text style={styles.clipRow}>
                                H: {clipDiag.baseMeasuredHeight}→{clipDiag.finalMeasuredHeight}px
                            </Text>
                        )}
                    </View>
                )}
                <Row label="CLIP" value={clipDiag?.severity ?? 'N/A'}
                    color={getClipColor(clipDiag?.severity ?? 'NONE')} />
                <Row label="Fix" value={clipDiag?.clipFixEnabled ? 'ON' : 'OFF'}
                    color={clipDiag?.clipFixEnabled ? '#10b981' : '#64748b'} />
                <Row label="Mode" value={clipDiag?.clipLineMetricsMode ?? 'NONE'} color="#60a5fa" />
                {clipDiag?.expansionTotalPx > 0 && (
                    <Row label="Expand" value={`+${clipDiag.expansionTotalPx}px`} color="#10b981" />
                )}

                {/* CONTINUITY GUARD PANEL */}
                <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 4 }} />
                {state.continuityDiag && (
                    <>
                        <Row label="CONTINUITY"
                            value={state.continuityDiag.status}
                            color={state.continuityDiag.status === 'OK' ? '#10b981' :
                                state.continuityDiag.status === 'GAP' ? '#ef4444' : '#f59e0b'} />
                        <Row label="Covered"
                            value={`${state.continuityDiag.coveredStart}→${state.continuityDiag.coveredEnd}`} />
                        <Row label="Chunks"
                            value={`${state.continuityDiag.chunkCountVisible}/${state.continuityDiag.chunkCountTotal}`} />
                        {state.continuityDiag.gapCount > 0 && (
                            <View style={{ backgroundColor: '#7f1d1d', padding: 2, marginTop: 2 }}>
                                <Text style={[styles.clipRow, { color: '#fca5a5' }]}>
                                    ⚠️ GAP: {state.continuityDiag.firstGapStart}→{state.continuityDiag.firstGapEnd} ({state.continuityDiag.maxGapSize} chars)
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* LAYOUT DIAG PANEL - Task 1 */}
                <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 4 }} />
                {state.layoutDiag && (
                    <View>
                        <Row label="LAYOUT DIAG"
                            value={state.layoutDiag.offsetGapDetected || state.layoutDiag.heightDeltaDetected || (state.layoutDiag.mapMismatchPx && state.layoutDiag.mapMismatchPx > 2) ? "ISSUES" : "OK"}
                            color={state.layoutDiag.offsetGapDetected || state.layoutDiag.heightDeltaDetected || (state.layoutDiag.mapMismatchPx && state.layoutDiag.mapMismatchPx > 2) ? "#ef4444" : "#10b981"}
                        />
                        <Row label="Mismatch" value={`${state.layoutDiag.mapMismatchPx ?? 0}px`}
                            color={(state.layoutDiag.mapMismatchPx ?? 0) > 2 ? '#ef4444' : '#94a3b8'} />
                        <Row label="ContentH" value={`${state.layoutDiag.finalContentHeight ?? 0}`} />

                        {state.layoutDiag.offsetGapDetected && (
                            <Text style={[styles.clipRow, { color: '#ef4444' }]}>
                                ⚠️ OFFSET GAP DETECTED
                            </Text>
                        )}
                        {state.layoutDiag.heightDeltaDetected && (
                            <Text style={[styles.clipRow, { color: '#ef4444' }]}>
                                ⚠️ HEIGHT DELTA DETECTED
                            </Text>
                        )}
                        {state.layoutDiag.items && state.layoutDiag.items.length > 0 && state.layoutDiag.items.slice(0, 3).map((item, idx) => (
                            <View key={idx} style={{ marginTop: 2, paddingLeft: 4, borderLeftWidth: 1, borderLeftColor: '#334155' }}>
                                <Text style={styles.clipRow}>
                                    #{item.chunkIndex} GAP:{item.offsetGap} ΔH:{item.heightDelta}
                                </Text>
                                <Text style={[styles.clipRow, { fontSize: 8, color: '#94a3b8' }]}>
                                    M:{item.measuredHeight} L:{item.layoutHeight} [{item.flags}]
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <Row label="Gesture" value={state.gestureMode} color={getGestureColor(state.gestureMode)} />

                <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 4 }} />
                <Row label="GATE" value={state.lugatGate} color={state.lugatGate === 'OPEN' ? '#10b981' : '#ef4444'} />
                <Row label="Reason" value={state.lastGateReason} />
                <Row label="Settle" value={state.lugatGate === 'CLOSED' ? `${Math.max(0, state.settleUntilMs - Date.now())}ms` : '-'} />
                <Row label="Rejects" value={`${state.gateRejectCount}`} color={state.gateRejectCount > 0 ? '#fbbf24' : undefined} />
                <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 4 }} />

                <Row label="Pointers" value={`${state.pointerCount}`} />
                <Row label="ZoomPreset" value={state.zoomPresetId} />
                <Row label="OverlayScale" value={state.overlayScale.toFixed(3)} color={state.overlayScale !== 1 ? '#fbbf24' : undefined} />
                <Row label="CommittedScale" value={state.committedScale.toFixed(3)} />
                <Row label="CommitMs" value={`${state.commitDurationMs}ms`} color={state.commitDurationMs > 300 ? '#ef4444' : '#10b981'} />
                <Row label="Scroll" value={state.scrollState} />
                <Row label="OffsetY" value={`${state.offsetY.toFixed(0)}`} />
                <Row label="VelocityY" value={`${state.scrollVelocityY.toFixed(1)}`} />
                <Row label="Layout#" value={`${state.layoutVersion}`} />
                <Row label="Events" value={`${state.eventCount}`} />
                <Row label="LastEvent" value={state.lastEventType} />
                {state.eventMismatchFlag && (
                    <Row label="⚠️ MISMATCH" value="true" color="#ef4444" />
                )}
            </>
        );
    };

    // Word tap tab content
    const TapTab = () => {
        const wt = state.lastWordTap;
        if (!wt) {
            return <Text style={styles.noData}>No word tap yet</Text>;
        }
        return (
            <>
                <Row label="Word" value={wt.word} />
                <Row label="Normalized" value={wt.wordNormalized} />
                <Row label="TokenIdx" value={`${wt.tokenIndex}`} />
                <Row label="Rect" value={`${wt.rectX.toFixed(0)},${wt.rectY.toFixed(0)} ${wt.rectW.toFixed(0)}x${wt.rectH.toFixed(0)}`} />
                <Row label="Offsets" value={`${wt.startOffset}→${wt.endOffset}`} />
                <Row label="OffsetY@Tap" value={`${wt.offsetY_atTapDown.toFixed(0)}`} />
                <Row label="Scale@Tap" value={`${wt.scale_atTapDown.toFixed(3)}`} />
                <Row label="Layout#" value={`${wt.layoutVersion}`} />
                <Row label="Candidates" value={`${wt.candidateCount}`} />
                <Row label="DistancePx" value={`${wt.selectedTokenDistancePx.toFixed(1)}`} color={wt.selectedTokenDistancePx > 20 ? '#fbbf24' : undefined} />
                <Row label="HitSource" value={wt.hitTestSource} color={getHitSourceColor(wt.hitTestSource)} />
            </>
        );
    };

    // Metrics tab content
    const MetricsTab = () => {
        const tm = state.textMetrics;
        const pm = state.popupMetrics;
        const dm = state.debugMetrics;

        return (
            <>
                {dm && (
                    <>
                        <Text style={styles.sectionTitle}>Diagnose ({state.zoomPresetId})</Text>
                        <Row label="Font / Line" value={`${dm.fontSize.toFixed(1)} / ${dm.computedLineHeightPx}`} />
                        <Row label="PaintHeight" value={`${dm.totalPaintHeightPx}`}
                            color={dm.totalPaintHeightPx > dm.computedLineHeightPx ? '#ef4444' : undefined} />
                        <Row label="ArabicH" value={`${dm.measuredArabicHeightPx}`} />
                        <Row label="Ascent/Descent" value={`${dm.nativeAscent.toFixed(1)} / ${dm.nativeDescent.toFixed(1)}`} />
                        <Row label="Word" value={dm.measuredArabicWord} />

                        {dm.clipRisk && (
                            <View style={{ backgroundColor: '#7f1d1d', marginTop: 4, padding: 2 }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>
                                    ⚠️ CLIP RISK DETECTED
                                </Text>
                            </View>
                        )}
                        <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 6 }} />
                    </>
                )}

                <Text style={styles.sectionTitle}>RN Text Metrics</Text>
                <Row label="BaseFontSize" value={`${tm.baseFontSize}`} />
                <Row label="AppliedFont" value={`${tm.appliedFontSize}`} />
                <Row label="LineHeight" value={`${tm.appliedLineHeight}`} />
                <Row label="ParaSpacing" value={`${tm.paragraphSpacing}`} />
                <Row label="MarginY" value={`${tm.pageMarginY}`} />

                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Popup Metrics</Text>
                <Row label="FontScale" value={`${pm.popupFontScale.toFixed(2)}`} />
                <Row label="MaxWidth" value={`${pm.popupMaxWidthPx}px`} />
                <Row label="Position" value={`${pm.popupX.toFixed(0)},${pm.popupY.toFixed(0)}`} />
                <Row label="Repositions" value={`${pm.popupRepositionCount}`} color={pm.popupRepositionCount > 0 ? '#fbbf24' : undefined} />
            </>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🔧 Native Debug HUD</Text>
                <Pressable onPress={toggleExpanded}>
                    <Text style={styles.closeBtn}>−</Text>
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <TabButton label="Main" active={activeTab === 'main'} onPress={() => setActiveTab('main')} />
                <TabButton label="Tap" active={activeTab === 'tap'} onPress={() => setActiveTab('tap')} />
                <TabButton label="Metrics" active={activeTab === 'metrics'} onPress={() => setActiveTab('metrics')} />
            </View>

            {/* Content */}
            <ScrollView style={styles.content} nestedScrollEnabled>
                {activeTab === 'main' && <MainTab />}
                {activeTab === 'tap' && <TapTab />}
                {activeTab === 'metrics' && <MetricsTab />}
            </ScrollView>

            {/* Error */}
            {state.lastError !== '-' && (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>⚠️ {state.lastError}</Text>
                </View>
            )}
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

const Row: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, color ? { color } : undefined]} numberOfLines={1}>
            {value}
        </Text>
    </View>
);

const TabButton: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getGestureColor(mode: string): string {
    switch (mode) {
        case 'IDLE': return '#64748b';
        case 'SCROLL_1P': return '#3b82f6';
        case 'PINCH_READY': return '#f59e0b';
        case 'PINCH_ACTIVE': return '#8b5cf6';
        case 'COMMITTING': return '#10b981';
        default: return '#fff';
    }
}

function getHitSourceColor(source: string): string {
    switch (source) {
        case 'direct': return '#10b981';
        case 'nearest': return '#3b82f6';
        case 'stale_fallback': return '#ef4444';
        default: return '#64748b';
    }
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 200,
        maxHeight: 320,
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderRadius: 8,
        zIndex: 9999,
        overflow: 'hidden',
    },
    collapsedContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        zIndex: 9999,
    },
    collapsedText: {
        color: '#10b981',
        fontSize: 9,
        fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#1e293b',
    },
    title: {
        color: '#10b981',
        fontSize: 10,
        fontWeight: 'bold',
    },
    closeBtn: {
        color: '#fff',
        fontSize: 16,
        paddingHorizontal: 4,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
    },
    tab: {
        flex: 1,
        paddingVertical: 4,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#10b981',
    },
    tabText: {
        color: '#64748b',
        fontSize: 9,
    },
    tabTextActive: {
        color: '#10b981',
        fontWeight: 'bold',
    },
    content: {
        padding: 6,
        maxHeight: 200,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 1,
    },
    label: {
        color: '#94a3b8',
        fontSize: 9,
        fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    },
    value: {
        color: '#fff',
        fontSize: 9,
        fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
        maxWidth: 100,
        textAlign: 'right',
    },
    sectionTitle: {
        color: '#10b981',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    noData: {
        color: '#64748b',
        fontSize: 9,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    errorBar: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    errorText: {
        color: '#fff',
        fontSize: 8,
    },
    clipRow: {
        color: '#fff',
        fontSize: 8,
        fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default NativeReaderDebugHUD;
