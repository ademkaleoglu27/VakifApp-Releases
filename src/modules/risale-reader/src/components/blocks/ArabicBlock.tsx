import React, { memo } from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

interface ArabicBlockProps {
    text: string;
    variant?: 'hero' | 'block'; // defaults to block
}

export const ArabicBlock: React.FC<ArabicBlockProps> = memo(({ text, variant = 'block' }) => {
    const isHero = variant === 'hero';

    // RN doesn't fully support 'wordSpacing' on Android depending on version, 
    // but the Prompt explicitly asked for it. We apply it.
    // Alignment: Center (Prompt 3.5)

    return (
        <View style={styles.container}>
            <Text style={[
                styles.text,
                isHero ? styles.heroText : styles.blockText
            ]}>
                {text}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginVertical: ReaderTheme.spacing.paragraphMargin, // "boşluk/padding dışında içerik değiştirilmez"
        paddingHorizontal: 8,
        alignItems: 'center', // Prompt: "align: center"
        width: '100%',
    },
    text: {
        color: ReaderTheme.colors.arabic,
        fontFamily: ReaderTheme.typography.arabicFont,
        writingDirection: 'rtl',
        textAlign: 'center', // Prompt: "align: center"
        // Prompt: "optimizeLegibility" is web, but in RN we rely on font.
        // Prompt: "kerning/ligature açık" -> usually default for Arabic fonts
    },
    heroText: {
        fontSize: ReaderTheme.typography.sizes.arabicHero,
        lineHeight: ReaderTheme.typography.lineHeights.arabicHero,
        // wordSpacing:
        // Prompt 3.5: "Word-spacing: +0.06em" for Hero
        // 29 * 0.06 ~= 1.74
        // @ts-ignore
        wordSpacing: 1.74,
    },
    blockText: {
        fontSize: ReaderTheme.typography.sizes.arabicBlock,
        lineHeight: ReaderTheme.typography.lineHeights.arabicBlock,
        // Prompt 3.5: "Word-spacing: -0.05em" (Updated from -0.06em in final prompt)
        // 26 * -0.05 = -1.3
        // @ts-ignore
        wordSpacing: ReaderTheme.typography.wordSpacing.arabicBlock,
    }
});
