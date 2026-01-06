import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily, ReaderTheme } from '@/config/fonts';

export type BlockType = 'heading' | 'note' | 'arabic_block' | 'label' | 'paragraph';

export interface SemanticBlock {
    type: BlockType;
    text: string;
}

interface SemanticReaderProps {
    blocks: SemanticBlock[];
    baseFontSize?: number;
}

export const SemanticReader: React.FC<SemanticReaderProps> = ({ blocks, baseFontSize = 20 }) => {
    const lineHeight = baseFontSize * 1.6;

    const renderBlock = (block: SemanticBlock, index: number) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
            case 'heading':
                return (
                    <Text key={key} style={[
                        styles.heading,
                        { fontSize: baseFontSize + 6, lineHeight: lineHeight + 8 }
                    ]}>
                        {block.text}
                    </Text>
                );
            case 'note':
                return (
                    <Text key={key} style={[
                        styles.note,
                        { fontSize: baseFontSize - 2, lineHeight: lineHeight }
                    ]}>
                        {block.text}
                    </Text>
                );
            case 'arabic_block':
                return (
                    <Text key={key} style={[
                        styles.arabic,
                        { fontSize: baseFontSize + 6, lineHeight: lineHeight + 12 }
                    ]}>
                        {block.text}
                    </Text>
                );
            case 'label':
                return (
                    <Text key={key} style={[
                        styles.label,
                        { fontSize: baseFontSize, lineHeight: lineHeight }
                    ]}>
                        {block.text}
                    </Text>
                );
            case 'paragraph':
            default:
                // Paragraph might need custom RichText handling for bold/italics if present inside text
                // But current blocking doesn't handle inline styling yet, assuming plain text for now.
                // Or if 'label' was split, paragraph follows.
                return (
                    <Text key={key} style={[
                        styles.paragraph,
                        { fontSize: baseFontSize, lineHeight: lineHeight }
                    ]}>
                        {block.text}
                    </Text>
                );
        }
    };

    return (
        <View style={styles.container}>
            {blocks.map(renderBlock)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
    },
    heading: {
        fontFamily: FontFamily.Title,
        color: ReaderTheme.titleText,
        textAlign: 'center',
        marginVertical: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    note: {
        fontFamily: FontFamily.BodyItalic,
        color: ReaderTheme.footnote,
        textAlign: 'center',
        marginVertical: 8,
        fontStyle: 'italic',
    },
    arabic: {
        fontFamily: FontFamily.Arabic,
        color: ReaderTheme.arabic,
        textAlign: 'center',
        writingDirection: 'rtl',
        marginVertical: 12,
        paddingHorizontal: 8,
    },
    label: {
        fontFamily: FontFamily.BodyBold,
        color: ReaderTheme.footnote,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 4,
        textAlign: 'left',
    },
    paragraph: {
        fontFamily: FontFamily.Body,
        color: ReaderTheme.text,
        textAlign: 'left', // Ensure left alignment to avoid rivers
        marginBottom: 12,
    },
});
