import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { LayoutMetrics } from '../engine/types';

interface Props {
    text: string;
    metrics: LayoutMetrics;
    onMeasured: (lines: any[]) => void;
    onError?: () => void;
}

/**
 * Renders text off-screen to get precise line metrics from the OS text engine.
 * Critical for V2 Pagination.
 */
export const TextMeasurerV2: React.FC<Props> = ({ text, metrics, onMeasured, onError }) => {
    if (!text) return null;

    return (
        <View
            style={styles.hiddenContainer}
            pointerEvents="none"
            aria-hidden={true}
        >
            <Text
                style={{
                    fontFamily: metrics.fontFamily,
                    fontSize: metrics.fontSize,
                    lineHeight: metrics.lineHeight,
                    width: metrics.width,
                    color: 'transparent',
                    textAlign: 'justify' // Match reader exactly
                }}
                onTextLayout={(e) => {
                    if (e.nativeEvent.lines.length > 0) {
                        onMeasured(e.nativeEvent.lines);
                    } else {
                        onError?.();
                    }
                }}
                numberOfLines={undefined} // Allow full expansion
            >
                {text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    hiddenContainer: {
        position: 'absolute',
        top: -99999,
        left: -99999,
        opacity: 0,
        zIndex: -1,
    }
});
