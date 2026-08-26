import React, { useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import QuranPageItem from './QuranPageItem';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface QuranVerticalListProps {
    totalPages: number;
    initialPage: number;
    onPageChanged: (page: number) => void;
    width: number;
    height: number;
}

const PAGE_ASPECT_RATIO = 1.55;

export const QuranVerticalList = ({ totalPages, initialPage, onPageChanged, width, height }: QuranVerticalListProps) => {
    const listRef = useRef<FlashList<number>>(null);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);

    const isLandscape = width > height;

    // Smart Dimension Calculations for 60 FPS Landscape & Portrait
    const itemHeight = useMemo(() => {
        if (isLandscape) {
            // In landscape: Fit height so full page is visible smoothly without massive texture thrashing
            return Math.round(height);
        }
        return Math.round(width * PAGE_ASPECT_RATIO);
    }, [isLandscape, width, height]);

    const itemWidth = width;

    const data = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

    const renderItem = useCallback(({ item }: { item: number }) => (
        <QuranPageItem
            pageNumber={item}
            width={itemWidth}
            height={itemHeight}
        />
    ), [itemWidth, itemHeight]);

    // Pinch: Scales the container
    const pinch = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 3));
        })
        .onEnd(() => {
            if (scale.value < 1.05) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                savedTranslateX.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    // Pan: Handles Horizontal movement when zoomed
    const pan = Gesture.Pan()
        .minPointers(1)
        .activeOffsetX([-20, 20])
        .onStart(() => {
            savedTranslateX.value = translateX.value;
        })
        .onUpdate((e) => {
            if (scale.value > 1.01) {
                translateX.value = savedTranslateX.value + e.translationX;
            }
        })
        .onEnd(() => {
            const maxTx = (width * scale.value - width) / 2;
            if (translateX.value > maxTx) translateX.value = withSpring(maxTx);
            else if (translateX.value < -maxTx) translateX.value = withSpring(-maxTx);
            else savedTranslateX.value = translateX.value;
        });

    const composed = Gesture.Simultaneous(pinch, pan);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateX: translateX.value }
        ]
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={[{ flex: 1 }, containerStyle]}>
                <FlashList
                    ref={listRef}
                    data={data}
                    renderItem={renderItem}
                    estimatedItemSize={itemHeight}
                    overrideItemLayout={(layout) => {
                        layout.size = itemHeight;
                    }}
                    drawDistance={isLandscape ? height * 1.5 : height}
                    onViewableItemsChanged={({ viewableItems }) => {
                        if (viewableItems.length > 0 && viewableItems[0].item) {
                            onPageChanged(viewableItems[0].item);
                        }
                    }}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    keyExtractor={item => `quran-page-${item}`}
                    initialScrollIndex={Math.max(0, initialPage - 1)}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                />
            </Animated.View>
        </GestureDetector>
    );
};
