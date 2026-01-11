import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar, ViewToken } from 'react-native';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { getChunksBySection, RisaleChunk } from '../../../services/risaleRepo';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import throttle from 'lodash/throttle';
import { Ionicons } from '@expo/vector-icons';
import { RisaleTextRenderer, isHeadingLine } from '../components/RisaleTextRenderer';
import { LugatInlineCard } from '../components/LugatInlineCard';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { RisaleChunkItem } from '../components/RisaleChunkItem';
import { LugatService } from '../../../services/lugatService';

const FONT_SIZE_KEY = 'risale_font_size';
const LAST_READ_KEY = 'last_read_risale';

const MIN_FONT_SCALE = 16;
const MAX_FONT_SCALE = 42;
const DEFAULT_FONT_SIZE = 20;

export const RisaleReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { sectionId, sectionTitle, workTitle: rawWorkTitle, initialBlockIndex } = route.params;

    // Clean up title (remove "Native Test" artifact if present)
    const workTitle = useMemo(() => rawWorkTitle.replace(/\s*\(Native Test\)\s*/i, '').trim(), [rawWorkTitle]);

    const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
    const flatListRef = useRef<any>(null);

    // Dynamic Header State (Consolidated)
    const [headerState, setHeaderState] = useState({
        subTitle: '',
        pageNumber: 0
    });

    const { data: chunks } = useQuery({
        queryKey: ['risaleChunks', sectionId],
        queryFn: async () => {
            const data = await getChunksBySection(sectionId);
            if (data && data.length > 0) {
                console.log("DEBUG CHUNKS SAMPLE:", JSON.stringify(data.slice(0, 3), null, 2));
            }
            return data;
        },
    });

    // Pre-calculate Header Indices for O(1) lookup or O(log n)
    const headerMap = useMemo(() => {
        if (!chunks) return [];
        const map: { index: number; title: string }[] = [];
        let currentTitle = sectionTitle; // Default start

        // Push initial
        map.push({ index: 0, title: currentTitle });

        chunks.forEach((c, idx) => {
            if (c.text_tr && isHeadingLine(c.text_tr)) {
                // Clean the heading text (remove newlines, extra spaces)
                const clean = c.text_tr.replace(/\r?\n|\r/g, ' ').trim();
                map.push({ index: idx, title: clean });
            }
        });
        return map;
    }, [chunks, sectionTitle]);

    // Lugat State (Global Popover)
    const [lugatWord, setLugatWord] = useState<string>('');
    const [lugatY, setLugatY] = useState<number>(0);
    const [lugatContext, setLugatContext] = useState<{ prev?: string; next?: string }>({});

    // Zoom State
    const lastFontSize = useRef(DEFAULT_FONT_SIZE);

    // Smart Reflow 2.0: Shared Values for Visual Feedback
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // ─────────────────────────────────────────────────────────────
    // ANCHOR MANAGEMENT (Smart Zoom)
    // ─────────────────────────────────────────────────────────────
    const anchorIndexRef = useRef<number | null>(null);
    const isRestoringRef = useRef(false);
    const restoreRequestedRef = useRef(false);

    // ─────────────────────────────────────────────────────────────
    // STABLE DATA REFS & CALLBACKS
    // ─────────────────────────────────────────────────────────────
    const chunksRef = useRef(chunks);
    const headerMapRef = useRef(headerMap);

    // Update refs whenever data changes
    useEffect(() => {
        chunksRef.current = chunks;
    }, [chunks]);

    useEffect(() => {
        headerMapRef.current = headerMap;
    }, [headerMap]);

    // Throttled Header Updater
    const updateHeaderState = useMemo(() => throttle((currentIndex: number) => {
        const currentHeaderMap = headerMapRef.current;
        if (!currentHeaderMap) return;

        // Find active header (Top-most visible item controls the header)
        let activeTitle = sectionTitle;
        // Search backwards efficiently
        for (let i = currentHeaderMap.length - 1; i >= 0; i--) {
            if (currentHeaderMap[i].index <= currentIndex) {
                activeTitle = currentHeaderMap[i].title;
                break;
            }
        }

        // Page Number - Use estimated calculation (Chunk based estimate)
        // Adjust divider based on approximate chunk count per page (7 is heuristic)
        const estimatedPage = Math.floor(currentIndex / 7) + 1;

        setHeaderState(prev => {
            if (prev.subTitle !== activeTitle || prev.pageNumber !== estimatedPage) {
                return { subTitle: activeTitle, pageNumber: estimatedPage };
            }
            return prev;
        });

    }, 120, { leading: true, trailing: true }), [sectionTitle]);

    // Stabilized Viewability Handler
    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (!viewableItems || viewableItems.length === 0) return;

        // Pick the top-most visible item (lowest index)
        const topItem = viewableItems[0];
        const currentIndex = topItem.index;

        if (currentIndex === null || currentIndex === undefined) return;

        // 1. Anchor Management
        if (!isRestoringRef.current) {
            anchorIndexRef.current = currentIndex;
        }

        // 2. Trigger Throttled Update
        updateHeaderState(currentIndex);

    }).current;

    // ─────────────────────────────────────────────────────────────
    // INITIAL LOAD & SAVE
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        AsyncStorage.getItem(FONT_SIZE_KEY).then(val => {
            if (val) {
                const fs = parseInt(val, 10);
                setFontSize(fs);
                lastFontSize.current = fs;
            }
        });
        navigation.setOptions({ headerShown: false });
    }, []);

    // Initial Scroll (Search Target)
    const initialScrollDoneRef = useRef(false);
    useEffect(() => {
        if (chunks && chunks.length > 0 && initialBlockIndex !== undefined && !initialScrollDoneRef.current) {
            const targetIndex = Math.min(initialBlockIndex, chunks.length - 1);
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: targetIndex,
                    animated: false,
                    viewPosition: 0,
                });
                initialScrollDoneRef.current = true;
            }, 250);
        }
    }, [chunks, initialBlockIndex]);

    const saveProgress = useMemo(() => throttle((chunk: RisaleChunk) => {
        AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify({
            workTitle,
            sectionId,
            chunkNo: chunk.chunk_no,
            title: sectionTitle
        }));
    }, 1000), [workTitle, sectionId, sectionTitle]);

    // ─────────────────────────────────────────────────────────────
    // ZOOM LOGIC (Smart Reflow 2.0)
    // ─────────────────────────────────────────────────────────────

    const onPinchUpdate = (e: any) => {
        scale.value = e.scale;
    };

    const onPinchEnd = (e: any) => {
        const finalScale = e.scale;
        const tentativeNewSize = lastFontSize.current * finalScale;
        const clampedSize = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(tentativeNewSize)));

        scale.value = withTiming(1, { duration: 150 });

        if (clampedSize !== lastFontSize.current) {
            restoreRequestedRef.current = true;
            isRestoringRef.current = true;
            runOnJS(setFontSize)(clampedSize);
            runOnJS(updateLastFontSize)(clampedSize);
        }
    };

    const updateLastFontSize = (val: number) => {
        lastFontSize.current = val;
        AsyncStorage.setItem(FONT_SIZE_KEY, val.toString());
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate(onPinchUpdate)
        .onEnd(onPinchEnd);

    const resetFont = () => {
        if (fontSize === DEFAULT_FONT_SIZE) return;
        restoreRequestedRef.current = true;
        isRestoringRef.current = true;

        setFontSize(DEFAULT_FONT_SIZE);
        lastFontSize.current = DEFAULT_FONT_SIZE;
        AsyncStorage.setItem(FONT_SIZE_KEY, DEFAULT_FONT_SIZE.toString());
        scale.value = 1;
    };

    // ─────────────────────────────────────────────────────────────
    // ANCHOR RESTORE
    // ─────────────────────────────────────────────────────────────
    const onContentSizeChange = () => {
        if (restoreRequestedRef.current && anchorIndexRef.current !== null) {
            restoreRequestedRef.current = false;
            flatListRef.current?.scrollToIndex({
                index: anchorIndexRef.current,
                animated: false,
                viewPosition: 0
            });
            setTimeout(() => {
                isRestoringRef.current = false;
            }, 100);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // RENDERERS
    // ─────────────────────────────────────────────────────────────

    const handleWordClick = useCallback(async (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => {
        if (lugatWord === word) {
            setLugatWord('');
            setLugatContext({});
            return;
        }

        setLugatContext({ prev, next });

        let resolvedWord = word;

        // SMART SPAN Logic
        if (prev) {
            const candidate = `${prev} ${word}`;
            const def = await LugatService.search(candidate);
            if (def) resolvedWord = candidate;
        }

        if (resolvedWord === word && next) {
            const candidate = `${word} ${next}`;
            const def = await LugatService.search(candidate);
            if (def) resolvedWord = candidate;
        }

        setLugatWord(resolvedWord);
        setLugatY(pageY);
    }, [lugatWord]);

    const handleExpandLeft = () => {
        if (lugatContext.prev) {
            const merged = `${lugatContext.prev} ${lugatWord}`;
            setLugatWord(merged);
            setLugatContext(c => ({ ...c, prev: undefined }));
        }
    };

    const handleExpandRight = () => {
        if (lugatContext.next) {
            const merged = `${lugatWord} ${lugatContext.next}`;
            setLugatWord(merged);
            setLugatContext(c => ({ ...c, next: undefined }));
        }
    };

    // ─────────────────────────────────────────────────────────────
    // SCROLL INTERACTIONS (Stutter Fix)
    // ─────────────────────────────────────────────────────────────
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollEndTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleScrollBegin = () => {
        if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
        setIsScrolling(true);
        if (lugatWord) setLugatWord(''); // Close dictionary on scroll
    };

    const handleScrollEnd = () => {
        if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
        scrollEndTimeout.current = setTimeout(() => {
            setIsScrolling(false);
        }, 150); // Debounce to prevent flicker on short stops
    };

    const isStandaloneSualChunk = useCallback((text: string) => {
        const trimmed = text.trim();
        const RE_SUAL = /^(SU[AÂa]L|EL-?CEVAP|CEVAP)\s*:$/i;
        return RE_SUAL.test(trimmed);
    }, []);

    const renderItem = useCallback(({ item, index }: { item: RisaleChunk; index: number }) => {
        let isAfterSual = false;
        if (index > 0 && chunks) {
            const prevChunk = chunks[index - 1];
            if (prevChunk && prevChunk.text_tr) {
                isAfterSual = isStandaloneSualChunk(prevChunk.text_tr);
            }
        }

        return (
            <RisaleChunkItem
                item={item}
                fontSize={fontSize}
                isAfterSual={isAfterSual}
                onWordPress={handleWordClick}
                interactiveEnabled={!isScrolling} // Disable interactivity during scroll
            />
        );
    }, [fontSize, handleWordClick, chunks, isStandaloneSualChunk, isScrolling]);

    // Viewability Config -> Stabilized
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
        minimumViewTime: 80,
        waitForInteraction: false,
    }).current;

    if (!chunks) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#B3261E" />
                <Text style={{ marginTop: 10, fontFamily: 'serif' }}>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FDF6E3' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FDF6E3" />

            {/* Custom Header (Minimal) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.headerBreadcrumb} numberOfLines={1}>
                        {workTitle} - <Text style={{ fontWeight: '700' }}>{headerState.subTitle || sectionTitle}</Text>
                    </Text>
                </View>

                {/* Page Number Badge */}
                <View style={styles.pageBadge}>
                    <Text style={styles.pageText}>{headerState.pageNumber > 0 ? `s. ${headerState.pageNumber}` : ''}</Text>
                </View>

                {/* Reset Zoom Button */}
                <TouchableOpacity onPress={resetFont} style={[styles.headerBtn, { marginLeft: 5 }]}>
                    <Ionicons name="text-outline" size={20} color="#5D4037" />
                </TouchableOpacity>
            </View>
            <View style={styles.headerSeparator} />
            <GestureDetector gesture={pinchGesture}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                        <FlashList
                            ref={flatListRef}
                            data={chunks}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            onContentSizeChange={onContentSizeChange}
                            extraData={isScrolling} // Re-render when scroll state changes

                            estimatedItemSize={110} // Adjusted to avg 110 as requested
                            drawDistance={200} // Tuned to 200
                            removeClippedSubviews={Platform.OS === 'android'}
                            contentContainerStyle={styles.listContent}

                            // Scroll Handlers
                            onScrollBeginDrag={handleScrollBegin}
                            onMomentumScrollBegin={handleScrollBegin}
                            onScrollEndDrag={handleScrollEnd}
                            onMomentumScrollEnd={handleScrollEnd}
                        />
                    </Animated.View>

                    {lugatWord ? (
                        <View style={{
                            position: 'absolute',
                            top: lugatY + 15,
                            left: 20,
                            right: 20,
                            zIndex: 9999,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}>
                            <LugatInlineCard
                                word={lugatWord}
                                onClose={() => setLugatWord('')}
                                prevWord={lugatContext.prev}
                                nextWord={lugatContext.next}
                                onExpandLeft={handleExpandLeft}
                                onExpandRight={handleExpandRight}
                            />
                        </View>
                    ) : null}
                </View>
            </GestureDetector>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF6E3',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDF6E3',
    },
    header: {
        height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 24) : 56,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FDF6E3',
        elevation: 2,
    },
    headerBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#795548',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    chunkContainer: {
        marginBottom: 8,
    },
    headerBreadcrumb: {
        fontSize: 14,
        color: '#3E2723',
        fontFamily: 'serif',
    },
    headerSeparator: {
        height: 1,
        width: '100%',
        backgroundColor: '#A1887F',
        marginBottom: 0,
        elevation: 2,
    },
    pageBadge: {
        backgroundColor: '#EFEBE9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginHorizontal: 8,
        borderRadius: 8,
    },
    pageText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#5D4037',
    },
});
