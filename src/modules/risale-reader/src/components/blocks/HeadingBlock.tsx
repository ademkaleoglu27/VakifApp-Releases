import React, { memo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

interface HeadingBlockProps {
    text: string;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = memo(({ text }) => {
    return (
        <Text style={styles.text}>{text}</Text>
    );
});

const styles = StyleSheet.create({
    text: {
        fontSize: ReaderTheme.typography.sizes.heading,
        color: ReaderTheme.colors.heading,
        fontWeight: 'bold',
        textAlign: 'center',
        // Corrected keys from new theme.ts
        marginTop: ReaderTheme.spacing.headingTop,
        marginBottom: ReaderTheme.spacing.headingBottom,
        fontFamily: ReaderTheme.typography.headingFont,
    }
});
