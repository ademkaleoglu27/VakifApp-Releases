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

    // Refs for stable callbacks passed to FlatList
    const onLocationChangeRef = useRef(onLocationChange);
    const onSectionChangeRef = useRef(onSectionChange);
    const blocksRef = useRef(content.blocks);

    // Keep refs up-to-date
    onLocationChangeRef.current = onLocationChange;
    onSectionChangeRef.current = onSectionChange;
    blocksRef.current = content.blocks;

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

    // Track item layouts for scroll-based calculations
    const itemLayoutsRef = useRef<{ [key: number]: { y: number; height: number } }>({});
    const ESTIMATED_ITEM_HEIGHT = 80; // Approximate height per block

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: ESTIMATED_ITEM_HEIGHT,
        offset: ESTIMATED_ITEM_HEIGHT * index,
        index,
    }), []);

    // onScroll-based page and section update (more reliable than viewability)
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const visibleIndex = Math.floor(offsetY / ESTIMATED_ITEM_HEIGHT);
        const blocks = blocksRef.current;

        if (!blocks || blocks.length === 0) return;

        // Clamp to valid range
        const safeIndex = Math.max(0, Math.min(visibleIndex, blocks.length - 1));

        // Calculate page
        const estimatedPage = Math.floor(safeIndex / BLOCKS_PER_PAGE) + 1;
        if (onLocationChangeRef.current) {
            onLocationChangeRef.current({ pageNumber: estimatedPage });
        }

        // Find active section (look backwards)
        for (let i = safeIndex; i >= 0; i--) {
            if (blocks[i] && blocks[i].type === 'heading') {
                if (onSectionChangeRef.current) {
                    onSectionChangeRef.current(blocks[i].text);
                }
                break;
            }
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

    // Use viewabilityConfigCallbackPairs for stable FlatList behavior
    // This is the recommended pattern to avoid the "changing onViewableItemsChanged" warning
    const viewabilityConfigCallbackPairs = useRef([
        {
            viewabilityConfig: {
                itemVisiblePercentThreshold: 50,
                minimumViewTime: 50,
            },
            onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken[] }) => {
                console.log('[SegmentRenderer] onViewableItemsChanged called, viewableItems:', viewableItems.length);

                if (viewableItems.length > 0) {
                    const firstVisible = viewableItems[0];
                    const visibleIndex = firstVisible.index || 0;
                    const estimatedPage = Math.floor(visibleIndex / BLOCKS_PER_PAGE) + 1;

                    console.log('[SegmentRenderer] visibleIndex:', visibleIndex, 'estimatedPage:', estimatedPage);

                    // Page Update - use ref for callback
                    if (onLocationChangeRef.current) {
                        console.log('[SegmentRenderer] Calling onLocationChangeRef with page:', estimatedPage);
                        onLocationChangeRef.current({ pageNumber: estimatedPage });
                    }

                    // Section Update (Look-behind logic)
                    // 1. Check if the top item itself is a heading
                    if (firstVisible.item.type === 'heading') {
                        console.log('[SegmentRenderer] Top item is heading:', firstVisible.item.text);
                        if (onSectionChangeRef.current) onSectionChangeRef.current(firstVisible.item.text);
                        return;
                    }

                    // 2. Search BACKWARDS from the first visible item to find the active section
                    let foundHeading: string | null = null;
                    const blocks = blocksRef.current;
                    console.log('[SegmentRenderer] Searching backwards, blocks count:', blocks?.length);

                    for (let i = visibleIndex; i >= 0; i--) {
                        if (blocks[i] && blocks[i].type === 'heading') {
                            foundHeading = blocks[i].text;
                            break;
                        }
                    }

                    console.log('[SegmentRenderer] Found heading:', foundHeading);
                    if (foundHeading && onSectionChangeRef.current) {
                        onSectionChangeRef.current(foundHeading);
                    }
                }
            },
        },
    ]).current;

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
                getItemLayout={getItemLayout}
                onScroll={handleScroll}
                scrollEventThrottle={100}
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
