import React, { useMemo, useCallback, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, ListRenderItem, ViewToken, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ReaderTheme } from '../constants/theme';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { ArabicBlock } from './blocks/ArabicBlock';
import { AyatHadithBlock } from './blocks/AyatHadithBlock';
import { DividerBlock } from './blocks/DividerBlock';


interface TextBlock {
    type: string;
    text: string;
    variant?: 'hero' | 'block' | 'inline'; // For Arabic differentiation
    pageNumber?: number; // Simulated page number for header
}

interface TextRendererProps {
    content: {
        blocks: TextBlock[];
        title?: string;
    };
    config: any; // ReaderConfig
    onLocationChange?: (location: any) => void;
    onFootnotePress?: (id: string) => void;
    onSectionChange?: (title: string) => void;
    onLugatLookup?: () => void; // Long-press opens empty BottomSheet (no word param)
}

export const SegmentRenderer: React.FC<TextRendererProps> = ({ content, config, onLocationChange, onFootnotePress, onSectionChange, onLugatLookup }) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Scroll state for long-press cancellation
    const isScrollingRef = useRef(false);

    // Virtual Page Calculation (Approximate)
    const BLOCKS_PER_PAGE = 8;
    const totalPages = Math.max(1, Math.ceil(content.blocks.length / BLOCKS_PER_PAGE));

    // Guarded long-press handler - cancels if scrolling
    const handleLugatLongPress = useCallback(() => {
        if (isScrollingRef.current) {
            if (__DEV__) {
                console.log('[SegmentRenderer] Long-press cancelled - user is scrolling');
            }
            return;
        }
        if (onLugatLookup) {
            onLugatLookup();
        }
    }, [onLugatLookup]);

    // Scroll event handlers
    const handleScrollBeginDrag = useCallback(() => {
        isScrollingRef.current = true;
        if (__DEV__) {
            console.log('[SegmentRenderer] Scroll started');
        }
    }, []);

    const handleMomentumScrollEnd = useCallback(() => {
        // Small delay to prevent immediate long-press after scroll ends
        setTimeout(() => {
            isScrollingRef.current = false;
            if (__DEV__) {
                console.log('[SegmentRenderer] Scroll ended');
            }
        }, 100);
    }, []);

    const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // If no momentum, scroll ends immediately
        const velocity = event.nativeEvent.velocity;
        if (!velocity || (Math.abs(velocity.y || 0) < 0.1)) {
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 100);
        }
    }, []);

    const renderItem: ListRenderItem<TextBlock> = useCallback(({ item }) => {
        switch (item.type) {
            case 'heading':
                return <HeadingBlock text={item.text} />;
            case 'arabic_block':
                // Arabic blocks excluded from long-press
                return <ArabicBlock text={item.text} variant={(item.variant as 'hero' | 'block') || 'block'} />;
            case 'ayah_hadith_block':
            case 'verse': // Legacy support
                return <AyatHadithBlock text={item.text} />;
            case 'note':
                return (
                    <ParagraphBlock
                        text={item.text}
                        style={{ fontStyle: 'italic', opacity: 0.8, fontSize: ReaderTheme.typography.sizes.footnote }}
                        onFootnotePress={onFootnotePress}
                        onLongPress={handleLugatLongPress}
                    />
                );
            case 'label':
                return (
                    <ParagraphBlock
                        text={item.text}
                        style={{ fontWeight: 'bold' }}
                        onFootnotePress={onFootnotePress}
                        onLongPress={handleLugatLongPress}
                    />
                );
            case 'divider':
                return <DividerBlock />;
            case 'paragraph':
            default:
                return (
                    <ParagraphBlock
                        text={item.text}
                        onFootnotePress={onFootnotePress}
                        onLongPress={handleLugatLongPress}
                    />
                );
        }
    }, [onFootnotePress, handleLugatLongPress]);

    const keyExtractor = useCallback((item: TextBlock, index: number) => index.toString(), []);

    const data = useMemo(() => content.blocks, [content]);

    // Viewability Config for "IntersectionObserver" logic
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 50,
    }).current;

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const firstVisible = viewableItems[0];
            const estimatedPage = Math.floor((firstVisible.index || 0) / BLOCKS_PER_PAGE) + 1;

            // Page Update
            if (estimatedPage !== currentPage) {
                setCurrentPage(estimatedPage);
                if (onLocationChange) {
                    onLocationChange({ pageNumber: estimatedPage });
                }
            }

            // Section Update (Find the last heading *before* or *at* the visible item)
            // This is a simplified approach: just check if the *top* visible item is a heading
            // For better "sticky" behavior, we'd search backwards from visible index, but for now:
            if (firstVisible.item.type === 'heading') {
                if (onSectionChange) {
                    onSectionChange(firstVisible.item.text);
                }
            } else {
                // Search visible items for a heading
                const visibleHeading = viewableItems.find(v => v.item.type === 'heading');
                if (visibleHeading && onSectionChange) {
                    onSectionChange(visibleHeading.item.text);
                }
            }
        }
    }, [currentPage, onLocationChange, onSectionChange]);

    return (
        <View style={styles.container}>

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.contentContainer}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                showsVerticalScrollIndicator={true}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ReaderTheme.colors.background,
    },
    contentContainer: {
        paddingHorizontal: ReaderTheme.spacing.pagePadding,
        // sticky header takes space, removing top padding usually or adjusting
        paddingTop: ReaderTheme.spacing.pagePadding,
        paddingBottom: 40,
    },
});
