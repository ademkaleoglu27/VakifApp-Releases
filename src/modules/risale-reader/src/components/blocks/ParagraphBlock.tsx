import React, { memo, useCallback } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, TextStyle, StyleProp } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

interface ParagraphBlockProps {
    text: string;
    onFootnotePress?: (id: string) => void;
    style?: StyleProp<TextStyle>;
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = memo(({ text, onFootnotePress, style }) => {
    // Regex to find standard footnote markers like [1], (1), or just numbers if specific format defined.
    // Diyanet/RNK usually uses [1] or similar. Assuming [id] format for now.
    const FOOTNOTE_REGEX = /\[(\d+)\]/g;

    const renderText = () => {
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = FOOTNOTE_REGEX.exec(text)) !== null) {
            // Text before marker
            if (match.index > lastIndex) {
                parts.push(
                    <Text key={`text-${lastIndex}`} style={styles.text}>
                        {text.substring(lastIndex, match.index)}
                    </Text>
                );
            }

            const footnoteId = match[1];
            // Marker
            parts.push(
                <Text
                    key={`fn-${match.index}`}
                    style={styles.footnote}
                    onPress={() => onFootnotePress && onFootnotePress(footnoteId)}
                    suppressHighlighting={false}
                >
                    {match[0]}
                </Text>
            );

            lastIndex = match.index + match[0].length;
        }

        // Remaining text
        if (lastIndex < text.length) {
            parts.push(
                <Text key={`text-${lastIndex}`} style={styles.text}>
                    {text.substring(lastIndex)}
                </Text>
            );
        }

        return parts.length > 0 ? parts : <Text style={styles.text}>{text}</Text>;
    };

    return (
        <Text style={[styles.container, style]}>
            {renderText()}
        </Text>
    );
});

const styles = StyleSheet.create({
    container: {
        // Container text style to ensure inline flow works
        textAlign: 'left',
        marginBottom: ReaderTheme.spacing.paragraphMargin,
    },
    text: {
        fontSize: ReaderTheme.typography.sizes.body,
        color: ReaderTheme.colors.text,
        lineHeight: ReaderTheme.typography.lineHeights.body,
        letterSpacing: ReaderTheme.typography.letterSpacing.body,
        fontFamily: ReaderTheme.typography.bodyFont,
    },
    footnote: {
        fontSize: ReaderTheme.typography.sizes.footnote,
        color: ReaderTheme.colors.footnote,
        lineHeight: ReaderTheme.typography.lineHeights.body, // Match body line height to keep flow
        fontWeight: 'bold',
        textAlignVertical: 'top', // Try to simulate superscript if possible, or just distinct color
        // Superscript simulation in RN is hard without nested views which break justify/wrap sometimes.
        // For now, rely on smaller size + color.
    }
});
