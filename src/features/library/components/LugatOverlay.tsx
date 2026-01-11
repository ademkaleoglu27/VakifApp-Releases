import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { LugatInlineCard } from './LugatInlineCard';
import { LugatService } from '../../../services/lugatService';

export interface LugatControlRef {
    open: (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => void;
    close: () => void;
}

export interface LugatControlRef {
    open: (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => void;
    close: () => void;
}

export const LugatOverlay = forwardRef<LugatControlRef>((_, ref) => {
    const [visible, setVisible] = useState(false);
    const [entry, setEntry] = useState<any>(null); // Using any temporarily to avoid tight coupling if type not exported
    const [y, setY] = useState(0);

    useImperativeHandle(ref, () => ({
        open: async (clickedWord: string, chunkId: number, pageY: number, prev?: string, next?: string) => {

            // Perform Multi-Word Smart Lookup
            const result = await LugatService.resolveMultiWordKey(clickedWord, prev, next);

            if (result) {
                // Open only if found (or if we want to show 'not found' we'd pass a dummy entry)
                setEntry(result);
                setY(pageY);
                setVisible(true);
            }
            // else: silently ignore click if no definition found? 
            // Or show toast? For now, silence is standard for "Reader" (no distraction)
        },
        close: () => {
            setVisible(false);
        }
    }));

    if (!visible || !entry) return null;

    return (
        <View style={[styles.container, { top: y + 20 }]}>
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
