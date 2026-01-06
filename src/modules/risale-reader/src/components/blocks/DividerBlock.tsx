import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ReaderTheme } from '../../constants/theme';

export const DividerBlock: React.FC = memo(() => {
    return (
        <View style={styles.container} />
    );
});

const styles = StyleSheet.create({
    container: {
        height: 1,
        backgroundColor: ReaderTheme.colors.separator,
        width: '50%', // "ince çizgi" usually implies distinct but not full width in some designs, but RNK standard implies page separator. 
        // Prompt says: "Sayfa arası ayırıcı: gri alan yerine ince çizgi"
        alignSelf: 'center',
        marginVertical: ReaderTheme.spacing.paragraphMargin * 2,
    }
});
