import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    View,
    FlatList,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    Alert,
    StatusBar,
    ViewToken
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Q_TOTAL_PAGES } from '@/config/quranMaps';
import { QURAN_PAGES_HQ } from '@/config/quranPagesHQ';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const LAST_READ_PAGE_KEY = 'q_last_page';

interface ImagePageProps {
    pageNumber: number;
    onZoomChange: (zoomed: boolean) => void;
    isHorizontal: boolean;
}

const ImagePage = React.memo(({ pageNumber, onZoomChange, isHorizontal }: ImagePageProps) => {
    const pageStr = pageNumber.toString().padStart(3, '0');
    const source = QURAN_PAGES_HQ[pageNumber];

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
                const maxTranslateY = (height * scale.value - height) / 2;

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

    // Make sure gestures don't conflict excessively
    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ],
    }));

    return (
        <View style={[styles.pageContainer, { width, height: height - 120, zIndex: isZoomed ? 999 : 1 }]}>
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.zoomWrapper, animatedStyle]}>
                    <View style={styles.frameContainer}>
                        {source ? (
                            <Image source={source} style={styles.pageImage} resizeMode="contain" />
                        ) : (
                            <View style={styles.placeholderPage}>
                                <Text style={styles.pageNumberWatermark}>{pageNumber}</Text>
                                <Text style={styles.placeholderText}>Sayfa {pageNumber}</Text>
                                <Text style={styles.instructionText}>
                                    Asset missing: {pageStr}.webp
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

export const QuranPageReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { page } = route.params || { page: 1 };

    const [currentPage, setCurrentPage] = useState(page);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [isImmersive, setIsImmersive] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    const handleZoomChange = useCallback((zoomed: boolean) => {
        setScrollEnabled(!zoomed);
    }, []);

    // Initial Onboarding Check
    useEffect(() => {
        const checkOnboarding = async () => {
            const hasSeen = await AsyncStorage.getItem('quran_guide_v1');
            if (!hasSeen) {
                setShowOnboarding(true);
            }
        };
        checkOnboarding();
    }, []);

    const closeOnboarding = async () => {
        setShowOnboarding(false);
        await AsyncStorage.setItem('quran_guide_v1', 'true');
    };

    const toggleImmersive = () => {
        setIsImmersive(prev => !prev);
    };

    useEffect(() => {
        if (page && page > 1) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: page - 1, animated: false });
            }, 100);
        }
    }, [page]);

    useEffect(() => {
        navigation.setOptions({
            title: `Sayfa ${currentPage}`,
            headerShown: !isImmersive,
            headerStyle: { backgroundColor: '#FFF8E1' }, // Match header to bg
            headerRight: () => (
                <TouchableOpacity onPress={handleBookmark} style={{ marginRight: 16 }}>
                    <Ionicons name="bookmark-outline" size={24} color="#5D4037" />
                </TouchableOpacity>
            )
        });
    }, [currentPage, navigation, isImmersive]);

    useEffect(() => {
        AsyncStorage.setItem(LAST_READ_PAGE_KEY, currentPage.toString());
    }, [currentPage]);

    const handleBookmark = () => {
        Alert.alert("Kaydedildi", `Sayfa ${currentPage} kaldığınız yer olarak güncellendi.`);
        AsyncStorage.setItem(LAST_READ_PAGE_KEY, currentPage.toString());
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            if (index !== null) {
                setCurrentPage(index + 1);
                setScrollEnabled(true);
            }
        }
    }).current;

    const pagesData = useMemo(() => Array.from({ length: Q_TOTAL_PAGES }, (_, i) => i + 1), []);

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF8E1" />
            <FlatList
                ref={flatListRef}
                data={pagesData}
                keyExtractor={(item) => item.toString()}
                horizontal={true}
                pagingEnabled={true}
                scrollEnabled={scrollEnabled}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                initialNumToRender={3}
                maxToRenderPerBatch={5}
                windowSize={7}
                removeClippedSubviews={false}
                renderItem={({ item }) => (
                    <ImagePage
                        pageNumber={item}
                        onZoomChange={handleZoomChange}
                        isHorizontal={true}
                    />
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                getItemLayout={(data, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
            />

            {!isImmersive && (
                <View style={styles.controlsContainer}>
                    {/* Mode Toggle Removed by User Request */}

                    <View style={styles.pageInfo}>
                        <Text style={styles.pageInfoText}>{currentPage} / {Q_TOTAL_PAGES}</Text>
                    </View>
                </View>
            )}

            {/* Onboarding Overlay */}
            {showOnboarding && (
                <View style={styles.onboardingOverlay}>
                    <View style={styles.onboardingCard}>
                        <Ionicons name="information-circle" size={48} color="#8D6E63" style={{ marginBottom: 10 }} />
                        <Text style={styles.onboardingTitle}>Okuma Modu</Text>

                        <Text style={styles.onboardingText}>
                            Kuran sayfalarını sağa/sola çevirerek okuyabilirsiniz.{"\n\n"}
                            Sayfaya <Text style={{ fontWeight: 'bold' }}>tek dokunarak</Text> tam ekran moduna geçebilirsiniz.
                            Yakınlaştırmak için iki parmağınızla büyütün.
                        </Text>

                        <TouchableOpacity style={styles.onboardingButton} onPress={closeOnboarding}>
                            <Text style={styles.onboardingButtonText}>Anlaşıldı</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </GestureHandlerRootView>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E1', // Soft Cream (User Request)
    },
    pageContainer: {
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#FFF8E1', // Match container
    },
    zoomWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    frameContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFF8E1',
    },
    pageImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFF8E1', // Match container to avoid white flash
    },
    placeholderPage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    pageNumberWatermark: {
        position: 'absolute',
        fontSize: 100,
        fontWeight: 'bold',
        color: 'rgba(0,0,0,0.05)',
    },
    placeholderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8D6E63',
        marginBottom: 10,
    },
    instructionText: {
        textAlign: 'center',
        color: '#A1887F',
        fontSize: 12,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20, // Space between mode toggle and page info
        zIndex: 20,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8D6E63',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
        elevation: 2
    },
    modeText: {
        color: '#FFF8E1',
        fontSize: 12,
        fontWeight: '600',
    },
    pageInfo: {
        backgroundColor: '#8D6E63',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        elevation: 2,
    },
    pageInfoText: {
        color: '#FFF8E1',
        fontSize: 14,
        fontWeight: '600',
    },
    // Onboarding Styles
    onboardingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: 20
    },
    onboardingCard: {
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 340,
        alignItems: 'center',
        elevation: 10,
        borderWidth: 2,
        borderColor: '#8D6E63'
    },
    onboardingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 12,
        textAlign: 'center'
    },
    onboardingText: {
        fontSize: 15,
        color: '#4E342E',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22
    },
    onboardingButton: {
        backgroundColor: '#8D6E63',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        elevation: 2
    },
    onboardingButtonText: {
        color: '#FFF8E1',
        fontSize: 16,
        fontWeight: 'bold'
    }
});
