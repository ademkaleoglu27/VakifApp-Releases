import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, FlatList, Image, Dimensions, ToastAndroid, Platform, ViewToken, Modal, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/config/theme';
import { CevsenPages } from '@/assets/cevsen';
import { useCevsenStore } from '@/store/cevsenStore';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Aspect ratio for the pages
const PAGE_ASPECT_RATIO = 1.45;
const PAGE_HEIGHT = width * PAGE_ASPECT_RATIO;

interface ImagePageProps {
    source: any;
    pageNumber: number;
    onZoomChange: (zoomed: boolean) => void;
}

const ImagePage = React.memo(({ source, pageNumber, onZoomChange }: ImagePageProps) => {
    // Reanimated Shared Values
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const [isZoomed, setIsZoomed] = useState(false);

    const updateZoomState = useCallback((zoomed: boolean) => {
        setIsZoomed(zoomed);
        onZoomChange(zoomed);
    }, [onZoomChange]);

    // Gestures
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1.05) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(updateZoomState)(false);
            } else if (scale.value > 3) {
                scale.value = withSpring(3);
                savedScale.value = 3;
                runOnJS(updateZoomState)(true);
            } else {
                savedScale.value = scale.value;
                runOnJS(updateZoomState)(true);
            }
        });

    const panGesture = Gesture.Pan()
        .enabled(isZoomed)
        .averageTouches(true)
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            if (scale.value > 1) {
                const maxTranslateX = (width * scale.value - width) / 2;
                const maxTranslateY = (PAGE_HEIGHT * scale.value - PAGE_HEIGHT) / 2;

                const clampedX = Math.min(Math.max(translateX.value, -maxTranslateX), maxTranslateX);
                const clampedY = Math.min(Math.max(translateY.value, -maxTranslateY), maxTranslateY);

                translateX.value = withSpring(clampedX);
                translateY.value = withSpring(clampedY);

                savedTranslateX.value = clampedX;
                savedTranslateY.value = clampedY;
            }
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1.05) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(updateZoomState)(false);
            } else {
                scale.value = withTiming(2.5);
                savedScale.value = 2.5;
                runOnJS(updateZoomState)(true);
            }
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ],
    }));

    return (
        <View style={[styles.pageContainer, { zIndex: isZoomed ? 999 : 1 }]}>
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.zoomWrapper, animatedStyle]}>
                    <Image
                        source={source}
                        style={styles.pageImage}
                        resizeMode="contain"
                    />
                </Animated.View>
            </GestureDetector>
            {/* Hide page number when zoomed to avoid clutter */}
            {!isZoomed && (
                <View style={styles.pageNumberContainer}>
                    <Text style={styles.pageNumberText}>{pageNumber}</Text>
                </View>
            )}
        </View>
    );
});

export const CevsenScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const route = useRoute<any>();
    const { initialPage } = route.params || {};

    // State
    const [currentPage, setCurrentPage] = useState(initialPage || 1);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [isImmersive, setIsImmersive] = useState(false);

    // Refs
    const flatListRef = useRef<FlatList>(null);

    // Store
    const { lastPage, setLastPage } = useCevsenStore();

    // Initial Scroll Effect
    useEffect(() => {
        if (initialPage && initialPage > 1 && flatListRef.current) {
            // Small timeout to ensure FlatList is ready
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialPage - 1, animated: false });
            }, 100);
        }
    }, [initialPage]);

    const handleZoomChange = useCallback((zoomed: boolean) => {
        setScrollEnabled(!zoomed);
        setIsImmersive(zoomed); // Hide controls when zoomed
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            if (index !== null) {
                const pageNum = index + 1;
                setCurrentPage(pageNum);
                setLastPage(pageNum);
            }
        }
    }).current;

    const renderItem = ({ item, index }: any) => (
        <ImagePage
            source={item}
            pageNumber={index + 1}
            onZoomChange={handleZoomChange}
        />
    );

    const getItemLayout = (_: any, index: number) => ({
        length: PAGE_HEIGHT,
        offset: PAGE_HEIGHT * index,
        index,
    });

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle={isImmersive ? "dark-content" : "light-content"}
                backgroundColor={isImmersive ? "transparent" : theme.colors.primary}
                translucent={isImmersive}
            />

            {!isImmersive && (
                <View style={[styles.customHeader, { paddingTop: insets.top }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cevşenül Kebir</Text>
                        <View style={{ width: 40, height: 1 }} />
                    </View>
                </View>
            )}

            <FlatList
                ref={flatListRef}
                data={CevsenPages}
                renderItem={renderItem}
                keyExtractor={(_, index) => `page-${index}`}
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                initialNumToRender={1}
                maxToRenderPerBatch={3}
                windowSize={5}
                removeClippedSubviews={true}
                scrollEnabled={scrollEnabled}
                getItemLayout={getItemLayout}
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    });
                }}
                pagingEnabled={false} // Snap to pages for better feel? Or free scroll?
            // User said "Sayfalar alt alta gayet güzel akıyor" in previous prompt.
            // So keep vertical, maybe disable pagingEnabled for continuous scroll.
            // But implemented Zoom requires a stable container. 
            // Let's enable pagingEnabled for stable "Go to Page" experience.
            />

            {/* Bottom Controls - Visible when not immersive */}
            {!isImmersive && (
                <View style={[styles.bottomControls, { paddingBottom: insets.bottom || 20 }]}>
                    <View style={styles.pageInfoPill}>
                        <Text style={styles.pageInfoText}>{currentPage} / {CevsenPages.length}</Text>
                    </View>
                </View>
            )}

            {/* Modal Removed */}
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff' // Changed to white to match pages
    },
    customHeader: {
        backgroundColor: theme.colors.primary,
        width: '100%',
        elevation: 4,
        zIndex: 10,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerButton: { padding: 8 },
    headerTitle: {
        color: '#fff', fontSize: 18, fontWeight: 'bold'
    },
    pageContainer: {
        width: width,
        height: PAGE_HEIGHT, // Use dynamic aspect ratio height
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    zoomWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageImage: {
        width: '100%',
        height: '100%',
    },
    pageNumberContainer: {
        position: 'absolute',
        bottom: 80, // Moved up to clear bottom controls
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    pageNumberText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 20,
        pointerEvents: 'box-none' // Let touches pass through area around pill
    },
    pageInfoPill: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    pageInfoText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
