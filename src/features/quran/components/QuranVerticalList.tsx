import React, { useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import QuranPageItem from './QuranPageItem';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, useDerivedValue, useAnimatedReaction } from 'react-native-reanimated';

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

    // NATIVE SCROLL STRATEGY:
    // We keep native scroll ALWAYS active for Y-axis (Vertical).
    // The Pan gesture handles X-axis (Horizontal).
    // We configure Pan to handle simultaneous interaction.

    const data = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);
    const itemHeight = width * PAGE_ASPECT_RATIO;

    const renderItem = useCallback(({ item }: { item: number }) => (
        <QuranPageItem
            pageNumber={item}
            width={width}
            height={itemHeight}
        />
    ), [width, itemHeight]);

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

    // Pan: Handles Horizontal movement only
    const pan = Gesture.Pan()
        .minPointers(1)
        // Tune activation: Only if moved horizontally significantly
        // This allows vertical touches to pass through to the ScrollView immediately
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
            // Clamp X
            if (translateX.value > maxTx) translateX.value = withSpring(maxTx);
            else if (translateX.value < -maxTx) translateX.value = withSpring(-maxTx);
            else savedTranslateX.value = translateX.value;
        });

    // Simultaneous allows Pan to track X while Native Scroll tracks Y (if physics allows)
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
                    onViewableItemsChanged={({ viewableItems }) => {
                        if (viewableItems.length > 0) {
                            onPageChanged(viewableItems[0].item);
                        }
                    }}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    keyExtractor={item => item.toString()}
                    initialScrollIndex={initialPage - 1}
                    scrollEventThrottle={16}
                />
            </Animated.View>
        </GestureDetector>
    );
};
