import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Dimensions } from 'react-native';
import { FlashList, ViewToken } from '@shopify/flash-list';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Segment, SegmentType } from './types';

interface NativeReaderProps {
    data: Segment[];
    initialSegmentId?: string;
    onProgressUpdate?: (segmentId: string) => void;
}

const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 2.5;

// Mock Renderers for different segment types
const SegmentItem = React.memo(({ item, fontScale }: { item: Segment, fontScale: number }) => {
    const baseSize = 18 * fontScale;

    switch (item.type) {
        case 'heading':
            return <Text style={[styles.heading, { fontSize: baseSize * 1.4 }]}>{item.text}</Text>;
        case 'paragraph':
            return <Text style={[styles.paragraph, { fontSize: baseSize }]}>{item.text}</Text>;
        case 'note':
            return <Text style={[styles.note, { fontSize: baseSize * 0.9 }]}>{item.text}</Text>;
        case 'arabic_block':
            return <Text style={[styles.arabic, { fontSize: baseSize * 1.5 }]}>{item.text}</Text>;
        default:
            return <Text style={[styles.paragraph, { fontSize: baseSize }]}>{item.text}</Text>;
    }
});

export const NativeReader: React.FC<NativeReaderProps> = ({ data, initialSegmentId, onProgressUpdate }) => {
    const [fontScale, setFontScale] = useState(1.0);
    const listRef = useRef<FlashList<Segment>>(null);
    const anchorRef = useRef<string | null>(initialSegmentId || (data[0]?.id ?? null));
    const isRestoring = useRef(false);

    // Create a map for fast ID -> Index lookup
    const indexMap = useMemo(() => {
        const map = new Map<string, number>();
        data.forEach((item, index) => map.set(item.id, index));
        return map;
    }, [data]);

    // 1. Anchor Capture
    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            // Capture the top-most visible item as anchor
            // FlashList viewableItems are sorted by index usually.
            const topItem = viewableItems[0];
            if (topItem.item.id) {
                anchorRef.current = topItem.item.id;
                onProgressUpdate?.(topItem.item.id);
            }
        }
    }, [onProgressUpdate]);

    // 2. Zoom interaction
    const savedScale = useSharedValue(1);
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            // In a real app we might animate this using Reanimated styles
            // For Reader V3 prompt, we just want to trigger flow. 
            // Logic: Update state onEnd or throttle.
        })
        .onEnd((e) => {
            let newScale = savedScale.value * e.scale;
            // Clamp and Snap logic would go here
            // For now, let's just simulate a discrete step or simple multiplier
            runOnJS(handleZoom)(e.scale);
        });

    const handleZoom = (scaleFactor: number) => {
        setFontScale(prev => {
            const next = Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, prev * scaleFactor));
            return parseFloat(next.toFixed(2)); // Round to avoid micro-renders
        });
        isRestoring.current = true; // Flag to trigger restore on next layout
    };

    // Simpler Zoom buttons for testing without gestures
    const zoomIn = () => handleZoom(1.1);
    const zoomOut = () => handleZoom(0.9);

    // 3. Anchor Restore
    const handleLayout = (e: LayoutChangeEvent) => {
        // This event fires when size changes, which happens on rotation too.
        // Also fires when content size changes due to font scale? 
        // FlashList usually handles content size change internally but `onContentSizeChange` is specific prop.
        // Let's use `isRestoring` flag to trigger scrollTo.
        restoreAnchor();
    };

    const restoreAnchor = () => {
        if (!anchorRef.current || !listRef.current) return;

        const index = indexMap.get(anchorRef.current);
        if (index !== undefined) {
            // Production Safe: Ensure we don't scroll if index is invalid
            // FlashList: scrollToIndex
            try {
                listRef.current.scrollToIndex({ index, animated: false, viewPosition: 0 });
            } catch (e) {
                console.warn("Scroll restore failed", e);
            }
        }
    };

    // Effect to trigger restore when fontScale changes (and thus re-renders items)
    useEffect(() => {
        if (isRestoring.current) {
            // We might need a small delay or rely on onContentSizeChange. 
            // In FlashList, changing item props (fontSize) will layout changes.
            // Repagination happens. 
            // We need to wait for layout? 
            // The prompt says: "onContentSizeChange veya layout stabil olduktan sonra"
        }
    }, [fontScale]);

    const onContentSizeChange = () => {
        if (isRestoring.current) {
            restoreAnchor();
            // Optional: reset flag after a delay or immediately if confident
            // isRestoring.current = false; // Maybe keep it true for a frame?
            setTimeout(() => { isRestoring.current = false; }, 100);
        }
    }

    return (
        <View style={styles.container}>
            {/* Debug Controls */}
            {/* <View style={{position:'absolute', zIndex:100, top: 40, right: 20, flexDirection:'row'}}>
                <Text onPress={zoomOut} style={{padding:10, backgroundColor:'white'}}>A-</Text>
                <Text onPress={zoomIn} style={{padding:10, backgroundColor:'white'}}>A+</Text>
            </View> */}

            <GestureDetector gesture={pinchGesture}>
                <View style={styles.readerContainer}>
                    <FlashList
                        ref={listRef}
                        data={data}
                        renderItem={({ item }) => <SegmentItem item={item} fontScale={fontScale} />}
                        estimatedItemSize={50} // 18 * 2 lines roughly
                        keyExtractor={(item) => item.id}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={{
                            itemVisiblePercentThreshold: 1, // Only consider item visible if >1% (basically on screen)
                            waitForInteraction: true
                        }}
                        onContentSizeChange={onContentSizeChange}
                        onLayout={handleLayout} // Covers rotation
                        removeClippedSubviews={!isRestoring.current} // Disable during restore per prompt
                    />
                </View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    readerContainer: {
        flex: 1,
    },
    heading: {
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#000',
        textAlign: 'center'
    },
    paragraph: {
        lineHeight: 30, // Dynamic line height would be better: fontSize * 1.5
        marginBottom: 10,
        color: '#333',
        textAlign: 'justify'
    },
    note: {
        fontStyle: 'italic',
        color: '#666',
        marginVertical: 5,
        paddingHorizontal: 10
    },
    arabic: {
        fontFamily: 'System', // use specific arabic font
        textAlign: 'right',
        marginVertical: 10
    }
});
