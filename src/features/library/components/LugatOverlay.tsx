import React, { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { LugatInlineCard } from './LugatInlineCard';
import { LugatService } from '../../../services/lugatService';

export interface LugatControlRef {
    open: (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => void;
    close: () => void;
    getCardHeight?: () => number;
}

export const LugatOverlay = forwardRef<LugatControlRef>((_, ref) => {
    const [visible, setVisible] = useState(false);
    const [entry, setEntry] = useState<any>(null);
    const [y, setY] = useState(0);
    const cardHeightRef = useRef(260); // Default estimate

    useImperativeHandle(ref, () => ({
        open: async (clickedWord: string, chunkId: number, pageY: number, prev?: string, next?: string) => {
            const result = await LugatService.resolveMultiWordKey(clickedWord, prev, next);

            if (result) {
                setEntry(result);
                setY(pageY);
                setVisible(true);
            }
        },
        close: () => {
            setVisible(false);
        },
        getCardHeight: () => cardHeightRef.current
    }));

    if (!visible || !entry) return null;

    return (
        <View
            style={[styles.container, { top: y }]}
            onLayout={(e) => {
                if (e.nativeEvent.layout.height > 50) {
                    cardHeightRef.current = e.nativeEvent.layout.height;
                }
            }}
        >
            <LugatInlineCard
                entry={entry}
                onClose={() => setVisible(false)}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});
