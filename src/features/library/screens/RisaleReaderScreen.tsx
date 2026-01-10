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

    // Dynamic Header State
    const [subTitle, setSubTitle] = useState<string>('');
    const [pageNumber, setPageNumber] = useState<number>(0);

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

    // Pre-calculate Heade Indices for O(1) lookup or O(log n)
    // Structure: [{ index: 0, title: "..." }, { index: 50, title: "..." }]
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
    const [activeLugatChunkId, setActiveLugatChunkId] = useState<number | null>(null);

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

    // Track visible items to use as anchor and Update Header
    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const first = viewableItems[0];

            // 1. Anchor Management
            if (!isRestoringRef.current && first.index !== null) {
                anchorIndexRef.current = first.index;
            }

            // 2. Dynamic Header & Page Update
            if (first.index !== null && chunks) {
                const currentIndex = first.index;

                // Find active header: Last header with index <= currentIndex
                // Since headerMap is sorted by index, we can search backwards or find last.
                // Given typical size (< 50 headers), findLast is fast enough or loop.
                let activeTitle = sectionTitle;
                for (let i = headerMap.length - 1; i >= 0; i--) {
                    if (headerMap[i].index <= currentIndex) {
                        activeTitle = headerMap[i].title;
                        break;
                    }
                }

                // Only update if changed to prevent render thrashing
                setSubTitle(prev => prev !== activeTitle ? activeTitle : prev);

                // Page Number - Search backwards for the last valid page number if current chunk lacks it
                let pNo = chunks[currentIndex]?.page_no;
                if (!pNo) {
                    for (let i = currentIndex; i >= 0; i--) {
                        if (chunks[i]?.page_no) {
                            pNo = chunks[i].page_no;
                            break;
                        }
                    }
                }

                // FALLBACK ESTIMATION (If DB has no page data)
                // Approx 7 paragraphs per page for standard Risale
                if (!pNo) {
                    pNo = Math.floor(currentIndex / 7) + 1;
                }

                if (pNo) {
                    setPageNumber(pNo);
                }
            }
        }
    }, [chunks, headerMap, sectionTitle]);



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
            }, 250); // Increased delay slightly for reliability
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

        // Calculate new font size based on scale
        const tentativeNewSize = lastFontSize.current * finalScale;
        const clampedSize = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(tentativeNewSize)));

        // Reset Visual Scale smoothly
        scale.value = withTiming(1, { duration: 150 });

        if (clampedSize !== lastFontSize.current) {
            // 1. Set Restore Flag
            restoreRequestedRef.current = true;
            isRestoringRef.current = true;

            // 2. Commit New Size
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

        // Ensure scale is 1
        scale.value = 1;
    };


    // ─────────────────────────────────────────────────────────────
    // ANCHOR RESTORE
    // ─────────────────────────────────────────────────────────────
    const onContentSizeChange = () => {
        if (restoreRequestedRef.current && anchorIndexRef.current !== null) {
            // Immediate restore attempt
            restoreRequestedRef.current = false;

            // We can't scroll immediately if layout isn't ready, but contentSizeChange usually means it is.
            // Using index-based scrolling (scrollToIndex) is reliable if data hasn't changed.
            flatListRef.current?.scrollToIndex({
                index: anchorIndexRef.current,
                animated: false,
                viewPosition: 0 // Top alignment
            });

            // Reset lock after short delay
            setTimeout(() => {
                isRestoringRef.current = false;
            }, 100);
        }
    };



    // ─────────────────────────────────────────────────────────────
    // RENDERERS
    // ─────────────────────────────────────────────────────────────

    const handleWordClick = useCallback(async (word: string, chunkId: number, pageY: number, prev?: string, next?: string) => {
        // Toggle off if same word clicked?
        if (lugatWord === word) {
            setLugatWord('');
            setLugatContext({});
            return;
        }

        // Save Raw Context for UI Builder
        setLugatContext({ prev, next });

        let resolvedWord = word;

        // SMART SPAN (V10): Check Compound Words
        // We eagerly check if the dictionary has the compound phrase.
        // Priority: Longest Match.

        // 1. Try "Prev + Word" (e.g. "Münim" + "Hakiki" -> "Münim-i Hakiki")
        if (prev) {
            const candidate = `${prev} ${word}`;
            const def = await LugatService.search(candidate);
            if (def) {
                resolvedWord = candidate;
            }
        }

        // 2. If not found, Try "Word + Next" (e.g. "Kamal-i" + "Suhulet")
        if (resolvedWord === word && next) {
            const candidate = `${word} ${next}`;
            const def = await LugatService.search(candidate);
            if (def) {
                resolvedWord = candidate;
            }
        }

        // 3. Fallback to single word (which LugatService will Stem)
        setLugatWord(resolvedWord);
        setLugatY(pageY);
    }, [lugatWord]);

    // Chain Handlers
    const handleExpandLeft = () => {
        if (lugatContext.prev) {
            const merged = `${lugatContext.prev} ${lugatWord}`;
            setLugatWord(merged);
            // After merge, consume prev? Or keep it?
            // "Münim-i Hakiki" -> if we merge left, prev is used.
            // Disable further Left? For V1, yes.
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


    // Helper to detect standalone "Sual:" (ends with colon, no content after)
    const isStandaloneSualChunk = useCallback((text: string) => {
        const trimmed = text.trim();
        const RE_SUAL = /^(SU[AÂa]L|EL-?CEVAP|CEVAP)\s*:$/i;
        return RE_SUAL.test(trimmed);
    }, []);

    const renderItem = useCallback(({ item, index }: { item: RisaleChunk; index: number }) => {
        // Premium V20: Check if previous chunk was standalone "Sual:"
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
            />
        );
    }, [fontSize, handleWordClick, chunks, isStandaloneSualChunk]);

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
            {/* NEW DYNAMIC HEADER (Golden Standard) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    {/* BREADCRUMB: Work - Section */}
                    <Text style={styles.headerBreadcrumb} numberOfLines={1}>
                        {workTitle} - <Text style={{ fontWeight: '700' }}>{subTitle || sectionTitle}</Text>
                    </Text>
                    {/* Separation Line for aesthetics if needed, or just clean Logic */}
                </View>

                {/* Page Counter */}
                <View style={styles.pageBadge}>
                    <Text style={styles.pageText}>
                        {pageNumber > 0 ? pageNumber : '-'} / 862
                    </Text>
                </View>

                {/* Reset Zoom Button (Subtle) */}
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
                            viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
                            onContentSizeChange={onContentSizeChange}

                            estimatedItemSize={350} // Optimized for paragraph height (avg 350px)
                            drawDistance={2500} // Render screens ahead for smoothness
                            removeClippedSubviews={Platform.OS === 'android'}
                            contentContainerStyle={styles.listContent}
                            onScrollBeginDrag={() => {
                                if (lugatWord) setLugatWord('');
                            }}
                        />
                    </Animated.View>

                    {/* GLOBAL LUGAT POPOVER (Outside Scaled View to prevent distortion) */}
                    {lugatWord ? (
                        <View style={{
                            position: 'absolute',
                            top: lugatY + 15, // Display slightly below touch point
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
                            // Lugat Logic is V13 Unified
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
        backgroundColor: '#FDF6E3', // Solarisized Light / Book paper
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDF6E3',
    },
    header: {
        height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 24) : 56, // Add StatusBar height
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0, // Push content down
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
    // NEW HEADER STYLES
    headerBreadcrumb: {
        fontSize: 14,
        color: '#3E2723', // Darker brown
        fontFamily: 'serif',
    },
    pageBadge: {
        backgroundColor: '#D7CCC8', // Gold/Tan shade
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        marginHorizontal: 8,
    },
    pageText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#3E2723',
    },
    headerSeparator: {
        height: 1,
        width: '100%',
        backgroundColor: '#A1887F', // Separator line
        marginBottom: 0,
        elevation: 2, // Shadow hint
    },
});
