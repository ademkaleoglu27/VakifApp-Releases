/**
 * SelectedWordOverlay.tsx v1.0
 * 
 * Visual feedback overlay showing selected word and rect highlight.
 * Shows right-side pill with word + tokenIndex and rect highlight on word.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import type { WordTapDebugInfo } from './ReaderDebugStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface SelectedWordOverlayProps {
    lastWordTap: WordTapDebugInfo | null;
    offsetY: number;
    overlayScale: number;
    visible?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const SelectedWordOverlay: React.FC<SelectedWordOverlayProps> = ({
    lastWordTap,
    offsetY,
    overlayScale,
    visible = true,
}) => {
    // Only show in DEV and when visible
    if (!__DEV__ || !visible || !lastWordTap) return null;

    // Calculate rect position in viewport coordinates
    // Native rect is in content coordinates, need to adjust for scroll and scale
    const adjustedRectY = (lastWordTap.rectY - offsetY) * overlayScale;
    const adjustedRectX = lastWordTap.rectX * overlayScale;
    const adjustedRectW = lastWordTap.rectW * overlayScale;
    const adjustedRectH = lastWordTap.rectH * overlayScale;

    // Check if rect is visible in viewport
    const isRectVisible = adjustedRectY > -adjustedRectH && adjustedRectY < SCREEN_HEIGHT;

    // Time since last tap
    const tapAge = Date.now() - lastWordTap.timestamp;
    const fadeOut = tapAge > 3000; // Fade after 3 seconds

    if (fadeOut) return null;

    return (
        <>
            {/* Word rect highlight */}
            {isRectVisible && (
                <View
                    style={[
                        styles.rectHighlight,
                        {
                            left: adjustedRectX + 32, // Account for content padding
                            top: adjustedRectY + 100, // Account for header/banner
                            width: adjustedRectW,
                            height: adjustedRectH,
                        },
                    ]}
                    pointerEvents="none"
                />
            )}

            {/* Right-side pill indicator */}
            <View style={styles.pillContainer} pointerEvents="none">
                <View style={styles.pill}>
                    <Text style={styles.pillLabel}>Selected:</Text>
                    <Text style={styles.pillWord} numberOfLines={1}>
                        {lastWordTap.word}
                    </Text>
                    <Text style={styles.pillIndex}>#{lastWordTap.tokenIndex}</Text>
                </View>

                <View style={styles.pillDetails}>
                    <Text style={styles.detailText}>
                        Offset: {lastWordTap.startOffset}→{lastWordTap.endOffset}
                    </Text>
                    <Text style={styles.detailText}>
                        Source: {lastWordTap.hitTestSource}
                    </Text>
                    <Text style={styles.detailText}>
                        Dist: {lastWordTap.selectedTokenDistancePx.toFixed(1)}px
                    </Text>
                </View>
            </View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    rectHighlight: {
        position: 'absolute',
        backgroundColor: 'rgba(16, 185, 129, 0.3)', // Emerald with alpha
        borderWidth: 2,
        borderColor: '#10b981',
        borderRadius: 4,
        zIndex: 8888,
    },
    pillContainer: {
        position: 'absolute',
        right: 8,
        top: SCREEN_HEIGHT * 0.40,
        alignItems: 'flex-end',
        zIndex: 8889,
    },
    pill: {
        backgroundColor: 'rgba(16, 185, 129, 0.95)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    pillLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        marginRight: 4,
    },
    pillWord: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        maxWidth: 100,
    },
    pillIndex: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 9,
        marginLeft: 4,
    },
    pillDetails: {
        backgroundColor: 'rgba(0,0,0,0.75)',
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    detailText: {
        color: '#94a3b8',
        fontSize: 9,
        fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    },
});

export default SelectedWordOverlay;
