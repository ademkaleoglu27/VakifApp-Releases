
import React, { useCallback, useRef, useMemo } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import GenericPageItem from './GenericPageItem';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ContentPackService } from '../services/ContentPackService';

interface GenericVerticalListProps {
    totalPages: number;
    initialPage: number;
    onPageChanged: (page: number) => void;
    width: number;
    height: number;
    service: ContentPackService;
}

const PAGE_ASPECT_RATIO = 1.414; // A4 Ratio approx, tweak as needed

export const GenericVerticalList = ({ totalPages, initialPage, onPageChanged, width, height, service }: GenericVerticalListProps) => {
    const listRef = useRef<FlashList<number>>(null);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);

    const data = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);
    const itemHeight = width * PAGE_ASPECT_RATIO;

    // Scroll to page when initialPage changes (e.g. from Menu navigation)
    React.useEffect(() => {
        if (listRef.current && initialPage > 0) {
            // Check if valid index
            if (initialPage <= totalPages) {
                listRef.current.scrollToIndex({ index: initialPage - 1, animated: false });
            }
        }
    }, [initialPage, totalPages]);

    const renderItem = useCallback(({ item }: { item: number }) => (
        <GenericPageItem
            pageNumber={item}
            width={width}
            height={itemHeight}
            service={service}
        />
    ), [width, itemHeight, service]);

    const pinch = Gesture.Pinch()
        .onStart(() => { savedScale.value = scale.value; })
        .onUpdate((e) => { scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 3)); })
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

    const pan = Gesture.Pan()
        .minPointers(1)
        .activeOffsetX([-20, 20])
        .onStart(() => { savedTranslateX.value = translateX.value; })
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
        transform: [{ scale: scale.value }, { translateX: translateX.value }]
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
                    initialScrollIndex={initialPage > 1 ? initialPage - 1 : 0}
                    scrollEventThrottle={16}
                />
            </Animated.View>
        </GestureDetector>
    );
};
