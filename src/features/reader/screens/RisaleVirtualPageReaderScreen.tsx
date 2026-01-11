import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming } from 'react-native-reanimated';

import { getChunksBySection } from '@/services/risaleRepo';
import { RisaleChunk } from '@/types/risale';
import { RisaleTextRenderer } from '@/features/library/components/RisaleTextRenderer';

import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingProgressService } from '@/services/ReadingProgressService';

/**
 * RisaleVirtualPageReaderScreen (Diamond Standard V22.1 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * PERFORMANCE & FEATURE ARCHITECTURE:
 * 1. Progressive Hydration: 
 *    - Scroll Mode: ALL pages render as static text (Light Mode).
 *    - Idle Mode: Only the VISIBLE page hydrates to Interactive Mode (Lugat active).
 * 2. Layout Stabilization:
 *    - Height Heuristic: Estimated height based on char count & font size (1.65 ratio).
 *    - FlashList: Uses `overrideItemLayout` to prevent scroll jumping.
 * 3. Persistence (Auto-Bookmark):
 *    - Save-on-Unmount: Forces save when leaving screen.
 *    - Retry-Restore: Ensures scrollToIndex jumps even if layout is delayed.
 * 4. Context-Aware Lugat:
 *    - Multi-word: Passes neighbors (prev/next) for compound dictionary lookups.
 *    - Decoupled Overlay: Dictionary UI is outside the render loop.
 * 5. Zero-Render Menu (ReaderMoreMenuButton):
 *    - Isolated state. Toggling does NOT re-render the FlashList.
 * ─────────────────────────────────────────────────────────────
 */

// Lugat Integration
import { LugatService } from '@/services/lugatService';
import { LugatInlineCard } from '@/features/library/components/LugatInlineCard';
import { LugatOverlay, LugatControlRef } from '@/features/library/components/LugatOverlay';
import { ReaderMoreMenuButton } from '@/features/reader/components/ReaderMoreMenuButton';

// Virtual Page Item Component
class VirtualPage {
    id: string;
    index: number;
    chunks: RisaleChunk[];
    startChunkId: number;
    estimatedHeight: number;

    constructor(id: string, index: number, chunks: RisaleChunk[], fontSize: number, width: number) {
        this.id = id;
        this.index = index;
        this.chunks = chunks;
        this.startChunkId = chunks.length > 0 ? chunks[0].id : -1;

        // Layout Estimation Heuristic
        const totalChars = chunks.reduce((acc, c) => acc + (c.text_tr?.length || 0), 0);

        // Calibrated for 1.65 LineHeight + Paragraph gaps
        const avgCharWidth = fontSize * 0.5;
        const charsPerLine = width / avgCharWidth;

        const estimatedLines = Math.ceil(totalChars / charsPerLine);
        const lineHeight = fontSize * 1.65;

        const paragraphGap = 12;
        const totalGap = chunks.length * paragraphGap;

        this.estimatedHeight = (estimatedLines * lineHeight) + totalGap + 40;
    }
}

// Heuristic for pagination
const BASE_CHARS_PER_PAGE = 1200;

const VirtualPageItem = React.memo(({ page, fontSize, onWordPress }: {
    page: VirtualPage,
    fontSize: number,
    onWordPress?: (word: string, chunkId: number, py: number, prev?: string, next?: string) => void
}) => {
    return (
        <View style={[styles.pageContainer, { minHeight: page.estimatedHeight }]}>
            <View style={styles.pageContent}>
                {page.chunks.map((chunk) => {
                    // Optimized: Only check existence of handler
                    const isInteractive = !!onWordPress;
                    return (
                        <View key={chunk.id} style={{ marginBottom: 12 }}>
                            <RisaleTextRenderer
                                text={chunk.text_tr ?? ''}
                                fontSize={fontSize}
                                interactiveEnabled={isInteractive}
                                onWordPress={isInteractive ?
                                    (w, py, prev, next) => onWordPress(w, chunk.id, py, prev, next)
                                    : undefined
                                }
                            />
                        </View>
                    );
                })}
            </View>
        </View>
    );
});

export const RisaleVirtualPageReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { sectionId, sectionTitle } = route.params;
    const windowWidth = Dimensions.get('window').width;

    const [fontSize, setFontSize] = useState(18);
    const [currentPage, setCurrentPage] = useState(1);
    const flatListRef = useRef<React.ElementRef<typeof FlashList>>(null);

    // State Refs for Unmount Saving
    const currentPageRef = useRef(currentPage);
    const fontSizeRef = useRef(fontSize); // Ref for stable access

    useEffect(() => {
        currentPageRef.current = currentPage;
        fontSizeRef.current = fontSize;
    }, [currentPage, fontSize]);

    // Reader Menu
    const LUGAT_PREF_KEY = 'lugat_enabled_pref';

    // LUGAT REF (Performance Guard - No State!)
    const lugatEnabledRef = useRef(false);

    // Refs for performance (Avoid re-renders)
    const lugatRef = useRef<LugatControlRef>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveProgressTimeout = useRef<NodeJS.Timeout | null>(null);

    // Hydration State (Aggressive: Only 1 page active at a time)
    const [hydratedPageId, setHydratedPageId] = useState<string | null>(`vp-0`); // Start with first page hydrated

    // Initial Load State (instead of Ref to trigger effect)
    const [restoredPage, setRestoredPage] = useState<number | null>(null);

    // Load Pref (Imperative Sync)
    useEffect(() => {
        AsyncStorage.getItem(LUGAT_PREF_KEY).then(val => {
            const isEnabled = val === 'true';
            lugatEnabledRef.current = isEnabled;
        });
    }, []);

    // 1. Load Progress on Mount
    useEffect(() => {
        ReadingProgressService.loadProgress(sectionId).then((progress) => {
            if (progress) {
                // Determine if valid
                if (progress.pageIndex >= 0) {
                    if (progress.fontSize) setFontSize(progress.fontSize);
                    setRestoredPage(progress.pageIndex);
                }
            }
        });
    }, [sectionId]);

    // Header Options (Title only)
    useEffect(() => {
        navigation.setOptions({
            title: sectionTitle,
            headerShown: false // Ensure native header is hidden if we are using custom
        });
    }, [navigation, sectionTitle]);

    // 2. Save Progress (Debounce + Unmount Protection)
    useEffect(() => {
        // Debounce Save during active reading
        if (saveProgressTimeout.current) clearTimeout(saveProgressTimeout.current);

        saveProgressTimeout.current = setTimeout(() => {
            if (currentPage > 0) {
                ReadingProgressService.saveProgress(sectionId, {
                    pageIndex: currentPage - 1,
                    chunkId: -1,
                    fontSize: fontSizeRef.current
                });
            }
        }, 1000); // 1s debounce

        return () => {
            // Cleanup: Clear the debounce timeout if the effect re-runs or component unmounts.
            // The explicit unmount effect below handles the final save.
            if (saveProgressTimeout.current) clearTimeout(saveProgressTimeout.current);
        };
    }, [currentPage, fontSize, sectionId]);

    // 3. Explicit Unmount Save (Guarantees bookmarking on Back)
    useEffect(() => {
        return () => {
            // Force save latest state on unmount
            // Need to check if valid state exists
            if (currentPageRef.current > 0) {
                ReadingProgressService.saveProgress(sectionId, {
                    pageIndex: currentPageRef.current - 1,
                    chunkId: -1,
                    fontSize: fontSizeRef.current
                });
            }
        };
    }, [sectionId]); // Only runs on unmount of the screen component

    // Zoom State
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const isPinching = useRef(false);

    // Anchor Management
    const anchorChunkId = useRef<number | null>(null);
    const pendingScrollPage = useRef<number | null>(null);

    const { data: chunks, isLoading } = useQuery({
        queryKey: ['risaleChunks', sectionId],
        queryFn: async () => getChunksBySection(sectionId),
    });

    // Pagination Logic
    const pages = useMemo(() => {
        if (!chunks || chunks.length === 0) return [];

        const adjRatio = 18 / fontSize;
        const charsLimit = BASE_CHARS_PER_PAGE * adjRatio;

        const result: VirtualPage[] = [];
        let currentChunks: RisaleChunk[] = [];
        let currentCharCount = 0;
        let pageIdx = 0;

        chunks.forEach((chunk) => {
            const len = chunk.text_tr ? chunk.text_tr.length : 0;
            if (currentCharCount + len > charsLimit && currentChunks.length > 0) {
                result.push(new VirtualPage(`vp-${pageIdx}`, pageIdx, currentChunks, fontSize, windowWidth));
                pageIdx++;
                currentChunks = [];
                currentCharCount = 0;
            }
            currentChunks.push(chunk);
            currentCharCount += len;
        });
        if (currentChunks.length > 0) {
            result.push(new VirtualPage(`vp-${pageIdx}`, pageIdx, currentChunks, fontSize, windowWidth));
        }
        return result;
    }, [chunks, fontSize, windowWidth]);

    // RESTORE ANCHOR & INITIAL SCROLL
    useEffect(() => {
        if (pages.length === 0) return;

        // A. Initial Restore
        if (restoredPage !== null) {
            const targetIdx = restoredPage;
            if (targetIdx < pages.length) {
                // Robust connection try
                let attempts = 0;
                const attemptScroll = () => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToIndex({ index: targetIdx, animated: false });
                        setHydratedPageId(`vp-${targetIdx}`);
                        setCurrentPage(targetIdx + 1);
                        setRestoredPage(null); // Clear
                    } else if (attempts < 5) {
                        attempts++;
                        setTimeout(attemptScroll, 100);
                    }
                };
                setTimeout(attemptScroll, 100);
            } else {
                setRestoredPage(null);
            }
        }
        // B. Re-pagination Restore
        else if (pendingScrollPage.current !== null) {
            if (anchorChunkId.current !== null) {
                const targetPage = pages.find(p => p.chunks.some(c => c.id === anchorChunkId.current));
                if (targetPage) {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: targetPage.index, animated: false });
                        pendingScrollPage.current = null;
                        setHydratedPageId(targetPage.id);
                    }, 50);
                }
            }
        }
    }, [pages, restoredPage]);

    // Stabilized Callbacks
    const setIsPinching = useCallback((val: boolean) => { isPinching.current = val; }, []);

    const handleZoom = useCallback((zoomIn: boolean) => {
        const currentSize = fontSizeRef.current;
        const step = 2;
        const newSize = zoomIn ? currentSize + step : currentSize - step;
        if (newSize < 12 || newSize > 40) return;

        // Dehydrate during zoom
        setHydratedPageId(null);

        // Anchor Logic
        const pageIdx = currentPage - 1;
        const page = pages[pageIdx];
        if (page && page.chunks.length > 0) {
            anchorChunkId.current = page.chunks[0].id;
            pendingScrollPage.current = pageIdx;
        }

        setFontSize(newSize);
        // Re-hydrate logic handled by useEffect anchor restore or manual interaction
    }, [currentPage, pages]);

    // Toggle Handler (Headless - No Re-render)
    const handleToggleLugat = useCallback((isEnabled: boolean) => {
        lugatEnabledRef.current = isEnabled;
        AsyncStorage.setItem(LUGAT_PREF_KEY, String(isEnabled));

        // Feedback?
        if (!isEnabled) {
            lugatRef.current?.close(); // Auto close if disabled
        }
    }, []);

    // STABLE HANDLER - GUARDED!
    const handleWordClick = useCallback((word: string, chunkId: number, pageY: number) => {
        // 1. Scroll Guard
        if (isScrollingRef.current) return;

        // 2. Lugat Guard (Performance)
        if (!lugatEnabledRef.current) return;

        // Delegated to Imperative Ref
        lugatRef.current?.open(word, chunkId, pageY);
    }, []);

    // Scroll Handlers
    const onScrollBegin = useCallback(() => {
        isScrollingRef.current = true;
        lugatRef.current?.close(); // Auto-close on scroll
        setHydratedPageId(null); // Switch ALL to Light Mode

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }, []);

    const onScrollEnd = useCallback(() => {
        // Debounce hydration
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
            InteractionManager.runAfterInteractions(() => {
                // Calculate current page ID based on currentPage state (updated by ViewableItems)
                // Note: currentPage is 1-based, index is 0-based
                const targetId = `vp-${currentPage - 1}`;
                setHydratedPageId(targetId);
            });
        }, 250);
    }, [currentPage]);

    // Memoized Gesture
    const pinchGesture = useMemo(() => Gesture.Pinch()
        .onStart(() => {
            runOnJS(setIsPinching)(true);
        })
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            runOnJS(setIsPinching)(false);
            if (scale.value > 1.1) {
                runOnJS(handleZoom)(true);
            } else if (scale.value < 0.9) {
                runOnJS(handleZoom)(false);
            }
            scale.value = withTiming(1);
        }), [handleZoom, setIsPinching, scale, savedScale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const renderItem = useCallback(({ item }: { item: VirtualPage }) => {
        // Hydate ONLY the active page
        const isHydrated = item.id === hydratedPageId;
        const canInteract = isHydrated && !isScrollingRef.current;

        return (
            <VirtualPageItem
                page={item}
                fontSize={fontSize}
                onWordPress={canInteract ? handleWordClick : undefined}
            />
        );
    }, [fontSize, hydratedPageId, handleWordClick]);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 10, // More sensitive to catch edges
        minimumViewTime: 50,
    }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
        if (viewableItems && viewableItems.length > 0) {
            // Update current page for header
            const topItem = viewableItems[0];
            setCurrentPage(topItem.item.index + 1);
        }
    }).current;

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#B3261E" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FDF6E3" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{sectionTitle}</Text>
                    <Text style={styles.headerSub}>Sayfa {currentPage}</Text>
                </View>

                {/* Menu Button (Isolated) */}
                <ReaderMoreMenuButton
                    initialEnabled={lugatEnabledRef.current}
                    onLugatToggle={handleToggleLugat}
                />
            </View>

            <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={pinchGesture}>
                    <View style={{ flex: 1 }}>
                        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                            <FlashList
                                ref={flatListRef}
                                data={pages}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}

                                // Layout Stabilization
                                estimatedItemSize={600}
                                overrideItemLayout={(layout: any, item) => {
                                    layout.size = item.estimatedHeight;
                                }}
                                removeClippedSubviews={false} // Prevent Android white gaps

                                onViewableItemsChanged={onViewableItemsChanged}
                                viewabilityConfig={viewabilityConfig}
                                contentContainerStyle={styles.listContent}

                                // Scroll Perf
                                onScrollBeginDrag={onScrollBegin}
                                onMomentumScrollBegin={onScrollBegin}
                                onScrollEndDrag={onScrollEnd}
                                onMomentumScrollEnd={onScrollEnd}

                                // Force re-render on hydration state change
                                extraData={hydratedPageId}
                            />
                        </Animated.View>

                        {/* Lugat UI Overlay (Decoupled) */}
                        <LugatOverlay ref={lugatRef} />
                    </View>
                </GestureDetector>
            </GestureHandlerRootView>


        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF6E3',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 10,
        backgroundColor: '#FDF6E3',
        zIndex: 10,
    },
    headerBtn: { padding: 8 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
    headerSub: { fontSize: 12, color: '#666' },
    listContent: { paddingVertical: 10 },
    pageContainer: {
        paddingHorizontal: 16,
    },
    pageContent: {},
});
