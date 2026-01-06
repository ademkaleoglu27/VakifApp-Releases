import React, { useEffect } from 'react';
import { Text, TextStyle, View } from 'react-native';

interface Props {
    text: string;
    width: number;
    style: TextStyle;
    onMeasured: (lines: number, height: number, lastLineWidth: number) => void;
}

/**
 * Renders text off-screen to measure its height and line count.
 * Critical for determining page breaks.
 */
export const HiddenTextMeasurer: React.FC<Props> = ({ text, width, style, onMeasured }) => {
    return (
        <View
            style={{
                position: 'absolute',
                left: -10000,
                top: -10000,
                width: width,
                opacity: 0,
                pointerEvents: 'none' // React Native 0.72+
            }}
            aria-hidden={true}
        >
            <Text
                style={style}
                onTextLayout={(e) => {
                    const { lines } = e.nativeEvent;
                    const height = lines.length * (style.lineHeight || 1.2 * (style.fontSize || 14));
                    // Better to use e.nativeEvent.lines.length to avoid pixel rounding issues if possible,
                    // but exact bounding box height is e.nativeEvent.layout.height (which might include padding)
                    // On Android, line height calculation can be tricky.
                    // Let's rely on nativeEvent which returns accurate line breakdown.

                    const totalHeight = lines.length > 0 ? lines[lines.length - 1].y + lines[lines.length - 1].height : 0;
                    onMeasured(lines.length, totalHeight, lines.length > 0 ? lines[lines.length - 1].width : 0);
                }}
            >
                {text}
            </Text>
        </View>
    );
};
