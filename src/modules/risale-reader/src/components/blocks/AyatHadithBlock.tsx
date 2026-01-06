import React, { memo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

interface AyatHadithBlockProps {
    text: string;
}

export const AyatHadithBlock: React.FC<AyatHadithBlockProps> = memo(({ text }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{text}</Text>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        // Screenshot shows NO box, just text flow with margins
        // Background matches page (transparent/same)
        paddingVertical: 10,
        marginVertical: ReaderTheme.spacing.paragraphMargin,
        alignItems: 'center',
        paddingHorizontal: 20, // Keep text from hitting edges if centered

        // "Sayfa arası ayırıcı: gri alan yerine ince çizgi" -> implies general clean look.
    },
    text: {
        fontSize: ReaderTheme.typography.sizes.body,
        // "Ayet/Arapça rengi: RNK kırmızısına yakın koyu kırmızı."
        // But this block is usually *Turkish*. The Arabic is in ArabicBlock.
        // If this is the Turkish translation, stick to Body Color or Footnote Color?
        // Usually translations are smaller or italic.
        color: ReaderTheme.colors.text,
        lineHeight: 28, // Close to body
        fontStyle: 'italic',
        textAlign: 'center',
        fontFamily: ReaderTheme.typography.bodyFont,
    }
});
