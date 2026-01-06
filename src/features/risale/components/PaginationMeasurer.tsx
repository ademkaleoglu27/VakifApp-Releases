import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { LayoutMetrics } from '../engine/types';

export interface MeasurementRequest {
    jobId: number;
    text: string;
    metrics: LayoutMetrics;

    // Job Metadata to pass back to callback (avoids stale closures)
    startOffset: number;
    chunkSize: number;
    attempt: number;
}

interface Props {
    request: MeasurementRequest | null;
    onMeasured: (jobId: number, lines: any[], fits: boolean, req: MeasurementRequest) => void;
}

export const PaginationMeasurer: React.FC<Props> = ({ request, onMeasured }) => {
    if (!request) return null;

    const { jobId, text, metrics } = request;

    // Calculate max lines based on USABLE text area height.
    const verticalPadding = metrics.verticalPadding || 0;
    const usableHeight = metrics.height - (verticalPadding * 2);

    // Ensure at least 1 line
    const maxLines = Math.max(1, Math.floor(usableHeight / metrics.lineHeight));

    return (
        <View
            style={styles.hiddenContainer}
            pointerEvents="none"
            aria-hidden={true}
        >
            <View style={{ width: metrics.width, height: metrics.height, opacity: 0 }}>
                <Text
                    style={{
                        fontFamily: metrics.fontFamily,
                        fontSize: metrics.fontSize,
                        lineHeight: metrics.lineHeight,
                        width: metrics.width,
                        color: 'transparent',
                        textAlign: 'justify',
                        padding: 0,
                        margin: 0
                    }}
                    onTextLayout={(e) => {
                        const lines = e.nativeEvent.lines;
                        if (!lines || lines.length === 0) {
                            console.warn('[PaginationMeasurer] 0 lines returns. Fallback triggered.');
                            onMeasured(jobId, [], false, request);
                            return;
                        }
                        const fits = lines.length <= maxLines;
                        onMeasured(jobId, lines, fits, request);
                    }}
                >
                    {text}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    hiddenContainer: {
        position: 'absolute',
        top: -99999,
        left: -99999,
        zIndex: -1,
        // Ensure layout is computed (non-zero constraints)
        minWidth: 1,
        minHeight: 1
    }
});
