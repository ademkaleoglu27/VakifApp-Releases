import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { RisaleChunk } from '../../../services/risaleRepo';
import { RisaleTextRenderer } from './RisaleTextRenderer';

type Props = {
    item: RisaleChunk;
    fontSize: number;
    isAfterSual?: boolean; // Premium V20: Previous chunk was standalone "Sual:"
    onWordPress: (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => void;
    interactiveEnabled: boolean;
};

export const RisaleChunkItem = memo((props: Props) => {
    const { item, fontSize, isAfterSual, onWordPress, interactiveEnabled } = props;

    return (
        <View style={styles.chunkContainer}>
            <RisaleTextRenderer
                text={item.text_tr ?? ''}
                fontSize={fontSize}
                isAfterSual={isAfterSual}
                interactiveEnabled={interactiveEnabled}
                // Pass pageY and context up to the screen
                onWordPress={(w, py, prev, next) => onWordPress(w, item.id, py, prev, next)}
            />
        </View>
    );
}, (prev, next) => {
    // Custom Comparison for Performance
    // 1. Content Check
    if (prev.item.id !== next.item.id) return false;
    if (prev.item.text_tr !== next.item.text_tr) return false;

    // 2. Font Size
    if (prev.fontSize !== next.fontSize) return false;

    // 3. Sual Context
    if (prev.isAfterSual !== next.isAfterSual) return false;

    // 4. Interactivity
    if (prev.interactiveEnabled !== next.interactiveEnabled) return false;

    return true;
});

const styles = StyleSheet.create({
    chunkContainer: {
        marginBottom: 8,
    },
});
