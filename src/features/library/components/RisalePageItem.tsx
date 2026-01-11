import React, { memo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RisaleChunk } from '../../../services/risaleRepo';
import { RisaleChunkItem } from './RisaleChunkItem';

type Props = {
    pageIndex: number; // 0-based page index (e.g., 0 for Page 1)
    chunks: RisaleChunk[];
    fontSize: number;
    // Context needed for isAfterSual calculation within the page
    onWordPress: (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => void;
    displayPageNo?: number; // Prop for Zen Mode Inline Page No
};

export const RisalePageItem = memo((props: Props) => {
    const { pageIndex, chunks, fontSize, onWordPress, displayPageNo } = props;

    // Helper to detect standalone "Sual:" (ends with colon, no content after)
    const isStandaloneSualChunk = (text: string) => {
        const trimmed = text.trim();
        const RE_SUAL = /^(SU[AÂa]L|EL-?CEVAP|CEVAP)\s*:$/i;
        return RE_SUAL.test(trimmed);
    };

    return (
        <View style={styles.pageContainer}>

            {/* ZEN MODE: Inline Page Number */}
            {displayPageNo && (
                <View style={styles.pageBadge}>
                    <Text style={styles.pageBadgeText}>{displayPageNo}</Text>
                </View>
            )}

            {chunks.map((item, index) => {
                // Determine isAfterSual locally within the page
                let isAfterSual = false;
                if (index > 0) {
                    const prevChunk = chunks[index - 1];
                    if (prevChunk && prevChunk.text_tr) {
                        isAfterSual = isStandaloneSualChunk(prevChunk.text_tr);
                    }
                }

                return (
                    <RisaleChunkItem
                        key={item.id}
                        item={item}
                        fontSize={fontSize}
                        isAfterSual={isAfterSual}
                        onWordPress={onWordPress}
                    />
                );
            })}

            {/* Visual Separator (Spacing only) */}
            <View style={styles.pageSeparator} />
        </View>
    );
}, (prev, next) => {
    // Optimization: Check Page ID/Index identity and Font Size
    if (prev.pageIndex !== next.pageIndex) return false;
    if (prev.fontSize !== next.fontSize) return false;
    if (prev.displayPageNo !== next.displayPageNo) return false; // Check page no prop
    // Check data integrity (if chunks array ref changes, usually implies content change)
    if (prev.chunks !== next.chunks) return false;

    return true;
});

const styles = StyleSheet.create({
    pageContainer: {
        position: 'relative', // For absolute badge
    },
    pageBadge: {
        position: 'absolute',
        top: 0,
        right: 16,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pageBadgeText: {
        fontSize: 12,
        color: '#8D6E63',
        fontFamily: 'serif',
        fontWeight: 'bold',
    },
    pageSeparator: {
        height: 20, // Space between 'Pages'
        marginBottom: 10,
    },
    // Removed unused pageHeader styles
});
