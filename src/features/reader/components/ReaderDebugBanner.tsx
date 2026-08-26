/**
 * ReaderDebugBanner.tsx v1.0
 * 
 * DEV-only banner showing Native Reader status.
 * Shows green "NATIVE ON" or red "NATIVE OFF: reason".
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { NativeReaderReason } from '../engine/NativeAvailability';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface ReaderDebugBannerProps {
    isNativeActive: boolean;
    reason: NativeReaderReason;
    viewName?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const ReaderDebugBanner: React.FC<ReaderDebugBannerProps> = ({
    isNativeActive,
    reason,
    viewName,
}) => {
    // Only show in DEV
    if (!__DEV__) return null;

    const isOn = isNativeActive && reason === 'ok';

    const statusText = isOn
        ? `NATIVE ON: ${viewName || 'NativeReaderView'}`
        : `NATIVE OFF: ${reason}`;

    return (
        <View style={[styles.container, isOn ? styles.containerOn : styles.containerOff]}>
            <Text style={styles.text}>
                {statusText}
            </Text>
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        zIndex: 9999,
    },
    containerOn: {
        backgroundColor: '#10b981', // Green
    },
    containerOff: {
        backgroundColor: '#ef4444', // Red
    },
    text: {
        color: '#fff',
        fontSize: 11,
        fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default ReaderDebugBanner;
