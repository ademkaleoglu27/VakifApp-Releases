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
    const [entry, setEntry] = useState<any>(null); // Kept for backward compat/single entry fallback
    const [compound, setCompound] = useState<any>(null);
    const [components, setComponents] = useState<any[]>([]);
    const [searchedWord, setSearchedWord] = useState('');

    const [y, setY] = useState(0);
    const cardHeightRef = useRef(260); // Default estimate

    useImperativeHandle(ref, () => ({
        open: async (clickedWord: string, chunkId: number, pageY: number, prev?: string, next?: string) => {
            // New logic: Resolve compound and components
            const { compound, components, searchedWord } = await LugatService.resolveCompoundWithComponents(clickedWord, prev, next);

            if (compound || components.length > 0) {
                setCompound(compound);
                setComponents(components);
                setSearchedWord(searchedWord);
                setEntry(null); // Clear single entry mode
                setY(pageY);
                setVisible(true);
            } else {
                // Fallback (though resolveCompoundWithComponents usually handles it)
                // If nothing found at all, we might still show "Not found"
                setCompound(null);
                setComponents([]);
                setSearchedWord(clickedWord);
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
                compound={compound}
                components={components}
                word={searchedWord}
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
