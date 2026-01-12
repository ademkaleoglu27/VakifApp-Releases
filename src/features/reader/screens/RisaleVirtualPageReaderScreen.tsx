import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar, Modal, ScrollView, AppState, AppStateStatus } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming } from 'react-native-reanimated';

import { buildReadingStream, buildSectionReadingStream, buildTocIndexMap, getNextSection, StreamItem } from '@/services/risaleRepo';
import { readingProgressStore } from '@/services/readingProgressStore';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { ENABLE_RESUME_LAST_READ } from '@/config/features';
import { RisaleChunk } from '@/types/risale';
import { RisaleTextRenderer } from '@/features/library/components/RisaleTextRenderer';

import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookLastRead } from '@/services/readingProgressStore';

// Lugat Integration
import { LugatOverlay, LugatControlRef } from '@/features/library/components/LugatOverlay';
import { ReaderMoreMenuButton } from '@/features/reader/components/ReaderMoreMenuButton';
import { FootnoteToggle } from '@/features/reader/components/FootnoteToggle';
// TOC removed from reader - now accessed via SectionList screen

/**
 * RisaleVirtualPageReaderScreen (Diamond Standard V24.0 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * CONTINUOUS READING STREAM IMPLEMENTATION + PROGRESS PERSISTENCE
 * 
 * Features:
 * 1. Full book stream (all sections in single FlashList)
 * 2. Book-like section headers (decorative dividers)
 * 3. Dynamic header (current section + position counter)
 * 4. Progressive Hydration (only visible page interactive)
 * 5. Lugat integration with controlled toggle
 * 6. Pinch-to-zoom preserved
 * 7. Inline footnotes (collapsed, lazy fetch, fail-soft)
 * 8. TOC accessed via SectionList screen (not in reader)
 * 
 * NEW IN V24.0 (Reading Progress - LOCKED):
 * - Book-based lastRead persistence (no cross-book bleed)
 * - Throttled writes (3s, only on page change)
 * - Gated restore with initialPositionLoaded flag
 * - AppState background + unmount flush
 * - "Yeniden Başla" menu action
 * - Navigation via initialLocation param from Contents
 * 
 * LOCKED: Do not modify Virtual Page, Hydration, Zoom, Footnote,
 *         or Reading Progress logic without extensive testing.
 * ─────────────────────────────────────────────────────────────
 */

// Regex to detect footnote references like [1], [2] in text
const FOOTNOTE_REF_REGEX = /\[(\d+)\]/g;

// Extract footnote numbers from a chunk's text
const extractFootnoteRefs = (text: string): number[] => {
    const refs: number[] = [];
    let match;
    while ((match = FOOTNOTE_REF_REGEX.exec(text)) !== null) {
        refs.push(parseInt(match[1], 10));
    }
    FOOTNOTE_REF_REGEX.lastIndex = 0; // Reset for reuse
    return refs;
};

// Page Item Component (Diamond Standard V23.1 - with Footnote Support)
const PageItem = React.memo(({ item, fontSize, onWordPress }: {
    item: StreamItem,
    fontSize: number,
    onWordPress?: (word: string, chunkId: number, py: number, prev?: string, next?: string) => void
}) => {
    if (!item.chunks) return null;

    // Collect all footnote refs in this page for display at end
    const allFootnoteRefs: number[] = [];
    item.chunks.forEach(chunk => {
        const refs = extractFootnoteRefs(chunk.text_tr ?? '');
        refs.forEach(r => {
            if (!allFootnoteRefs.includes(r)) {
                allFootnoteRefs.push(r);
            }
        });
    });

    return (
        <View style={styles.pageContainer}>
            {item.chunks.map((chunk) => {
                const isInteractive = !!onWordPress;
                return (
                    <View key={chunk.id} style={{ marginBottom: 12 }}>
                        <RisaleTextRenderer
                            text={chunk.text_tr ?? ''}
                            fontSize={fontSize}
                            interactiveEnabled={isInteractive}
                            variant={chunk.type === 'poetry' ? 'poetry' : undefined}
                            poetryLines={chunk.meta?.lines}
                            onWordPress={isInteractive ?
                                (w, py, prev, next) => onWordPress(w, chunk.id, py, prev, next)
                                : undefined
                            }
                        />
                    </View>
                );
            })}

            {/* Footnote Toggles at end of page */}
            {allFootnoteRefs.length > 0 && (
                <View style={styles.footnoteSection}>
                    {allFootnoteRefs.map(refNum => (
                        <FootnoteToggle
                            key={`fn-toggle-${item.sectionId}-${refNum}`}
                            sectionId={item.sectionId}
                            footnoteNumber={refNum}
                            fontSize={fontSize}
                        />
                    ))}
                </View>
            )}
        </View>
    );
});

// Section Header Component (Book-like aesthetic)
const SectionHeader = React.memo(({ item, isMain }: { item: StreamItem, isMain: boolean }) => (
    <View style={[styles.sectionHeader, isMain ? styles.mainHeader : styles.subHeader]}>
        {isMain && <View style={styles.headerDecorTop} />}
        <Text style={[styles.sectionHeaderText, isMain ? styles.mainHeaderText : styles.subHeaderText]}>
            {item.title}
        </Text>
        {isMain && <View style={styles.headerDecorBottom} />}
    </View>
));




export const RisaleVirtualPageReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { bookId, workId, sectionId: startSectionId, workTitle } = route.params;
    const effectiveWorkId = bookId || workId || 'sozler';
    const windowWidth = Dimensions.get('window').width;

    const [fontSize, setFontSize] = useState(18);
    const [currentSectionTitle, setCurrentSectionTitle] = useState(workTitle || 'Okuyucu');
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);  // Global page ordinal display
    const [totalPages, setTotalPages] = useState(0);  // Total pages in book

    const flatListRef = useRef<any>(null);
    const fontSizeRef = useRef(fontSize);
    const currentItemRef = useRef(currentItemIndex);

    // Reading Progress State
    const didRestoreRef = useRef(false);
    const lastPersistedIndexRef = useRef(-1);
    const [initialTarget, setInitialTarget] = useState<{ streamIndex: number; sectionId?: string } | null>(null);
    const [initialPositionLoaded, setInitialPositionLoaded] = useState(false); // Flag to wait for async loading
    const [isReadyToRender, setIsReadyToRender] = useState(false); // NO-FLASH: Gate rendering
    const [targetError, setTargetError] = useState<string | null>(null); // FAIL-SAFE: Show error instead of wrong page
    const [nextSection, setNextSection] = useState<{ id: string; title: string } | null>(null); // V25.7 Next Section
    const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null); // V25.3: Fail-safe timeout

    // V25.3: Mode detection - strict separation
    const navMode = route.params?.mode; // 'target' | 'resume' | 'section' | undefined
    const navSource = route.params?.source; // 'toc' | 'resume' | undefined
    const isTargetMode = navMode === 'target' && navSource === 'toc';
    const isSectionMode = navMode === 'section' && navSource === 'toc'; // V25.6
    // V25.4: Disable resume mode if flag is off
    const isResumeMode = ENABLE_RESUME_LAST_READ && (navMode === 'resume' || route.params?.initialLocation !== undefined);
    const targetLocation = route.params?.targetLocation;
    const resumeLocation = route.params?.resumeLocation || route.params?.initialLocation;

    useEffect(() => {
        fontSizeRef.current = fontSize;
        currentItemRef.current = currentItemIndex;
    }, [fontSize, currentItemIndex]);

    // Lugat State
    const LUGAT_PREF_KEY = 'lugat_enabled_pref';
    const lugatEnabledRef = useRef(false);
    const [lugatEnabled, setLugatEnabled] = useState(false); // State to trigger re-render
    const [lugatPrefLoaded, setLugatPrefLoaded] = useState(false); // Track if pref loaded
    const lugatRef = useRef<LugatControlRef>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Hydration State
    const [hydratedItemId, setHydratedItemId] = useState<string | null>(null);

    // Load Lugat Pref
    useEffect(() => {
        AsyncStorage.getItem(LUGAT_PREF_KEY).then(val => {
            const enabled = val === 'true';
            lugatEnabledRef.current = enabled;
            setLugatEnabled(enabled);
            setLugatPrefLoaded(true);
        });
    }, []);

    // V25.7: Load Next Section Info (on mount or when sectionId changes)
    useEffect(() => {
        if (!isSectionMode || !route.params?.sectionId) return;

        getNextSection(effectiveWorkId, route.params.sectionId).then(next => {
            setNextSection(next);
        });
    }, [effectiveWorkId, route.params?.sectionId, isSectionMode]);

    // Fetch Stream (Full Book or Section Only)
    const { data: stream, isLoading } = useQuery({
        queryKey: ['readingStream', effectiveWorkId, isSectionMode ? route.params.sectionId : 'full'],
        queryFn: async () => {
            if (isSectionMode && route.params.sectionId) {
                return buildSectionReadingStream(effectiveWorkId, route.params.sectionId);
            }
            return buildReadingStream(effectiveWorkId);
        },
    });

    // TOC Index Map - kept for initial scroll to section
    const tocIndexMap = useMemo(() => {
        if (!stream) return new Map<string, number>();
        return buildTocIndexMap(stream);
    }, [stream]);

    // Hydrate first page item when stream loads
    useEffect(() => {
        if (stream && stream.length > 0) {
            // Set total pages count from stream
            const maxPage = stream.reduce((max, item) =>
                item.globalPageOrdinal && item.globalPageOrdinal > max ? item.globalPageOrdinal : max, 0);
            setTotalPages(maxPage);

            // Hydrate first page if not done
            if (!hydratedItemId) {
                const firstPage = stream.find(s => s.type === 'page');
                if (firstPage) {
                    setHydratedItemId(firstPage.id);
                }
            }
        }
    }, [stream, hydratedItemId]);

    // Load initial position on mount (before stream is ready)
    useEffect(() => {
        // Reset flags when navigation params change (allows re-navigation to same screen)
        didRestoreRef.current = false;
        setInitialPositionLoaded(false);
        setInitialTarget(null);

        const loadInitialPosition = async () => {
            // Priority 1: Explicit initialLocation from route params (from Contents "Kaldığın Yer")
            const routeInitial = route.params?.initialLocation;
            if (routeInitial?.streamIndex !== undefined) {
                setInitialTarget({ streamIndex: routeInitial.streamIndex, sectionId: routeInitial.sectionId });
                setInitialPositionLoaded(true);
                return;
            }

            // Priority 2: Explicit section navigation from Contents (sectionId)
            if (startSectionId) {
                // Will be handled after stream loads via tocIndexMap
                setInitialPositionLoaded(true);
                return;
            }

            // Priority 3: Load saved book position
            const saved = await readingProgressStore.getBookLastRead(effectiveWorkId);
            if (saved && saved.streamIndex >= 0) {
                setInitialTarget({ streamIndex: saved.streamIndex, sectionId: saved.sectionId });
            }
            setInitialPositionLoaded(true);
        };
        loadInitialPosition();
    }, [effectiveWorkId, route.params?.initialLocation?.streamIndex, startSectionId]);


    // V25.1: Scroll retry state
    const scrollRetryCountRef = useRef(0);
    const MAX_SCROLL_RETRIES = 3;
    const pendingScrollIndexRef = useRef<number | null>(null);

    // Execute scroll with retry logic
    const executeScrollToIndex = useCallback((targetIndex: number) => {
        if (!flatListRef.current || !stream) return;

        pendingScrollIndexRef.current = targetIndex;

        try {
            flatListRef.current.scrollToIndex({ index: targetIndex, animated: false });
            // If successful, mark as ready
            InteractionManager.runAfterInteractions(() => {
                didRestoreRef.current = true;
                setIsReadyToRender(true);
                pendingScrollIndexRef.current = null;
                console.log('[Reader] V25.3: Scroll succeeded', { targetIndex });
            });
        } catch (e) {
            console.warn('[Reader] V25.3: scrollToIndex failed, will retry in onScrollToIndexFailed');
        }
    }, [stream]);

    // V25.3: Fail-safe timeout - never stay stuck on loading
    useEffect(() => {
        if (isReadyToRender || targetError) return; // Already done
        if (!stream || stream.length === 0) return; // Stream not ready yet

        // Set 3 second timeout for fail-safe
        timeoutRef.current = setTimeout(() => {
            if (!isReadyToRender && !targetError) {
                console.warn('[Reader] V25.5: TIMEOUT - 3s passed, applying GUARANTEED FALLBACK');

                // CRITICAL: Never go back. Always render content.
                // Fallback to section start (0) if we couldn't resolve target in time.
                // This ensures "Sayfa hazırlanıyor" never stays forever.
                didRestoreRef.current = true;
                setIsReadyToRender(true);
            }
        }, 3000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [stream, isReadyToRender, targetError]);

    // Restore position when stream is ready AND initial position has been determined
    useEffect(() => {
        // Wait for both stream AND initial position loading to complete
        if (!stream || stream.length === 0 || didRestoreRef.current || !initialPositionLoaded) return;

        // V25.6: SECTION STREAM MODE - Immediate Render
        if (isSectionMode) {
            // Stream contains ONLY the target section, so we start at 0
            console.log('[Reader] V25.6: SECTION MODE - Valid stream loaded, rendering immediately');
            didRestoreRef.current = true;
            setIsReadyToRender(true);
            return;
        }

        // V25.5: STRICT TARGET MODE - GUARANTEED RENDER
        if (isTargetMode) {
            let targetIndex = -1;
            const requestedIndex = targetLocation?.firstPageIndex;

            // 1. Try explicit index from TOC
            if (typeof requestedIndex === 'number' && requestedIndex >= 0 && requestedIndex < stream.length) {
                targetIndex = requestedIndex;
            }
            // 2. If invalid, try to find section start in stream
            else if (targetLocation?.sectionId) {
                const sectionStart = stream.findIndex(s => s.sectionId === targetLocation.sectionId && s.type === 'page');
                if (sectionStart >= 0) targetIndex = sectionStart;
            }

            // 3. Absolute Fallback: Index 0
            if (targetIndex < 0) {
                console.warn('[Reader] V25.5: Target not found, using absolute fallback (0)', targetLocation);
                targetIndex = 0;
            }

            // Execute Scroll - Guaranteed
            scrollRetryCountRef.current = 0;
            InteractionManager.runAfterInteractions(() => {
                executeScrollToIndex(targetIndex);
                console.log('[Reader] V25.5: TARGET MODE - Scrolling to', { targetIndex, method: targetIndex === requestedIndex ? 'explicit' : 'fallback' });
            });
            return;
        }

        // V25.3: RESUME MODE - Continue reading
        if (isResumeMode) {
            const resumeIndex = resumeLocation?.streamIndex ?? resumeLocation?.firstPageIndex;

            if (typeof resumeIndex === 'number' && resumeIndex >= 0 && resumeIndex < stream.length) {
                scrollRetryCountRef.current = 0;
                InteractionManager.runAfterInteractions(() => {
                    executeScrollToIndex(resumeIndex);
                    console.log('[Reader] V25.3: RESUME MODE - Scrolling to', { resumeIndex });
                });
            } else {
                // Resume location invalid - start at position 0 with warning
                console.warn('[Reader] V25.3: RESUME MODE - Invalid resumeIndex, starting at 0', { resumeIndex });
                didRestoreRef.current = true;
                setIsReadyToRender(true);
            }
            return;
        }

        // DEFAULT MODE: Normal open (no mode specified)
        // Handle initialTarget (from saved position)
        if (initialTarget && initialTarget.streamIndex > 0 && initialTarget.streamIndex < stream.length) {
            scrollRetryCountRef.current = 0;
            InteractionManager.runAfterInteractions(() => {
                executeScrollToIndex(initialTarget.streamIndex);
                console.log('[Reader] V25.3: DEFAULT MODE - Restored saved position', { streamIndex: initialTarget.streamIndex });
            });
        } else {
            // No saved position, start at position 0
            didRestoreRef.current = true;
            setIsReadyToRender(true);
            console.log('[Reader] V25.3: DEFAULT MODE - Starting at position 0');
        }
    }, [stream, initialTarget, initialPositionLoaded, isTargetMode, isResumeMode, targetLocation, resumeLocation, effectiveWorkId, executeScrollToIndex, navigation]);


    // Throttled persist on page change
    const persistPosition = useCallback((streamIndex: number) => {
        if (!ENABLE_RESUME_LAST_READ) return;

        // Skip if not yet restored (prevents overwriting saved position during init)
        if (!didRestoreRef.current) return;
        // Skip if same position
        if (streamIndex === lastPersistedIndexRef.current) return;

        // Cancel pending persist
        if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
        }

        // Schedule new persist (throttle 3s)
        persistTimeoutRef.current = setTimeout(() => {
            if (!stream?.[streamIndex]) return;

            const item = stream[streamIndex];
            const data: BookLastRead = {
                sectionId: item.sectionId,
                streamIndex,
                ts: Date.now(),
            };

            lastPersistedIndexRef.current = streamIndex;
            readingProgressStore.setBookLastRead(effectiveWorkId, data);
            readingProgressStore.setGlobalLastRead({
                bookId: effectiveWorkId,
                ...data,
            });
        }, 3000);
    }, [stream, effectiveWorkId]);

    // AppState background handler - flush progress
    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'background' || nextState === 'inactive') {
                readingProgressStore.flush();
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, []);

    // Unmount flush - save position immediately
    useEffect(() => {
        return () => {
            // Cancel pending throttled save
            if (persistTimeoutRef.current) {
                clearTimeout(persistTimeoutRef.current);
            }
            // Force save current position
            if (didRestoreRef.current && stream && currentItemRef.current >= 0) {
                const idx = currentItemRef.current;
                const item = stream[idx];
                if (item) {
                    readingProgressStore.saveNow(effectiveWorkId, {
                        sectionId: item.sectionId,
                        streamIndex: idx,
                        ts: Date.now(),
                    });
                }
            }
        };
    }, [stream, effectiveWorkId]);

    // Header Update based on visible item
    const updateCurrentSection = useCallback((visibleItems: any[]) => {
        if (!stream || visibleItems.length === 0) return;

        const topItem = visibleItems[0]?.item as StreamItem;
        if (!topItem) return;

        // If it's a header, use its title
        if (topItem.type === 'section_header' || topItem.type === 'sub_header') {
            setCurrentSectionTitle(topItem.title || 'Okuyucu');
        } else {
            // Find nearest preceding header
            const currentIdx = topItem.orderIndex;
            for (let i = currentIdx; i >= 0; i--) {
                const item = stream[i];
                if (item.type === 'section_header' || item.type === 'sub_header') {
                    setCurrentSectionTitle(item.title || 'Okuyucu');
                    break;
                }
            }
        }
        setCurrentItemIndex(topItem.orderIndex);
    }, [stream]);

    // Zoom State (preserved)
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const isPinching = useRef(false);
    const setIsPinching = useCallback((val: boolean) => { isPinching.current = val; }, []);

    const handleZoom = useCallback((zoomIn: boolean) => {
        const currentSize = fontSizeRef.current;
        const step = 2;
        const newSize = zoomIn ? currentSize + step : currentSize - step;
        if (newSize < 12 || newSize > 40) return;
        setHydratedItemId(null);
        setFontSize(newSize);
    }, []);

    // Toggle Lugat (triggers re-render)
    const handleToggleLugat = useCallback((isEnabled: boolean) => {
        lugatEnabledRef.current = isEnabled;
        setLugatEnabled(isEnabled); // Trigger re-render
        AsyncStorage.setItem(LUGAT_PREF_KEY, String(isEnabled));
        if (!isEnabled) lugatRef.current?.close();
    }, []);

    // Restart Book Handler - Reset to beginning
    const handleRestartBook = useCallback(() => {
        if (!stream || stream.length === 0) return;

        // Scroll to beginning
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });

        // Update current position
        setCurrentItemIndex(0);

        // Find first page's section
        const firstItem = stream[0];
        const data: BookLastRead = {
            sectionId: firstItem?.sectionId || '',
            streamIndex: 0,
            ts: Date.now(),
        };

        // Save immediately
        lastPersistedIndexRef.current = 0;
        readingProgressStore.saveNow(effectiveWorkId, data);
    }, [stream, effectiveWorkId]);

    // Word Click (preserved) - with lugatPrefLoaded guard
    const handleWordClick = useCallback((word: string, chunkId: number, pageY: number) => {
        if (isScrollingRef.current) return;
        if (!lugatPrefLoaded) return; // Guard: don't process until pref loaded
        if (!lugatEnabledRef.current) return;
        lugatRef.current?.open(word, chunkId, pageY);
    }, [lugatPrefLoaded]);

    // Scroll Handlers (preserved)
    const onScrollBegin = useCallback(() => {
        isScrollingRef.current = true;
        lugatRef.current?.close();
        setHydratedItemId(null);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }, []);

    const onScrollEnd = useCallback(() => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
            InteractionManager.runAfterInteractions(() => {
                if (stream && stream[currentItemRef.current]) {
                    setHydratedItemId(stream[currentItemRef.current].id);
                }
            });
        }, 250);
    }, [stream]);

    // Pinch Gesture (preserved)
    const pinchGesture = useMemo(() => Gesture.Pinch()
        .onStart(() => { runOnJS(setIsPinching)(true); })
        .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
        .onEnd(() => {
            runOnJS(setIsPinching)(false);
            if (scale.value > 1.1) { runOnJS(handleZoom)(true); }
            else if (scale.value < 0.9) { runOnJS(handleZoom)(false); }
            scale.value = withTiming(1);
        }), [handleZoom, setIsPinching, scale, savedScale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Render Item
    const renderItem = useCallback(({ item }: { item: StreamItem }) => {
        if (item.type === 'section_header') {
            return <SectionHeader item={item} isMain={true} />;
        }
        if (item.type === 'sub_header') {
            return <SectionHeader item={item} isMain={false} />;
        }

        // Page
        const isHydrated = item.id === hydratedItemId;
        const canInteract = isHydrated && !isScrollingRef.current && lugatEnabled;

        return (
            <PageItem
                item={item}
                fontSize={fontSize}
                onWordPress={canInteract ? handleWordClick : undefined}
            />
        );
    }, [fontSize, hydratedItemId, handleWordClick, lugatEnabled]);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 10,
        minimumViewTime: 50,
    }).current;

    // Use callback instead of ref to access current stream
    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
        if (!stream || viewableItems.length === 0) return;

        const topItem = viewableItems[0]?.item as StreamItem;
        if (!topItem) return;

        // Update stream index
        setCurrentItemIndex(topItem.orderIndex);

        // Update page number from globalPageOrdinal
        if (topItem.type === 'page' && topItem.globalPageOrdinal) {
            setCurrentPageNumber(topItem.globalPageOrdinal);
        } else {
            // Find nearest page's globalPageOrdinal
            for (let i = topItem.orderIndex; i >= 0; i--) {
                const item = stream[i];
                if (item?.type === 'page' && item.globalPageOrdinal) {
                    setCurrentPageNumber(item.globalPageOrdinal);
                    break;
                }
            }
        }

        // Update section title
        if (topItem.type === 'section_header' || topItem.type === 'sub_header') {
            setCurrentSectionTitle(topItem.title || 'Okuyucu');
        } else {
            // Find nearest preceding header
            for (let i = topItem.orderIndex; i >= 0; i--) {
                const item = stream[i];
                if (item && (item.type === 'section_header' || item.type === 'sub_header')) {
                    setCurrentSectionTitle(item.title || 'Okuyucu');
                    break;
                }
            }
        }

        // Persist position (throttled)
        persistPosition(topItem.orderIndex);
    }, [stream, persistPosition]);


    const handleTocSelect = useCallback((sectionId: string) => {
        const targetIndex = tocIndexMap.get(sectionId);
        if (targetIndex !== undefined && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: targetIndex, animated: true });
        }
    }, [tocIndexMap]);

    // Direct scroll by index for TOCLauncher (isolated)
    const handleTocScrollToIndex = useCallback((streamIndex: number) => {
        if (flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: streamIndex, animated: true });
        }
    }, []);

    // Estimate item size based on type
    const getItemSize = useCallback((item: StreamItem) => {
        if (item.type === 'section_header') return 80;
        if (item.type === 'sub_header') return 60;
        // Page: estimate based on chunk count
        const chunkCount = item.chunks?.length || 0;
        return Math.max(200, chunkCount * 100);
    }, []);

    const renderFooter = useCallback(() => {
        if (!isSectionMode) return null; // No footer in full book mode

        return (
            <View style={{ padding: 32, paddingBottom: 80, alignItems: 'center', gap: 24 }}>
                {/* Minimalist Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, opacity: 0.6 }}>
                    <View style={{ width: 40, height: 1, backgroundColor: '#8D6E63' }} />
                    <Ionicons name="book-outline" size={16} color="#8D6E63" />
                    <View style={{ width: 40, height: 1, backgroundColor: '#8D6E63' }} />
                </View>

                {nextSection ? (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: '#FDF6E3', // Match page bg
                            borderWidth: 1,
                            borderColor: '#D7CCC8', // Subtle border
                            paddingVertical: 16,
                            paddingHorizontal: 24, // Wider padding for elegance
                            borderRadius: 8,
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            maxWidth: 340, // Max width for tablet friendliness
                            shadowColor: '#5D4037',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                        onPress={() => {
                            navigation.replace('RisaleVirtualPageReader', {
                                bookId: effectiveWorkId,
                                mode: 'section',
                                source: 'toc',
                                sectionId: nextSection.id,
                                sectionTitle: nextSection.title,
                                workTitle: route.params?.workTitle || effectiveWorkId,
                            });
                        }}
                    >
                        <Text style={{ color: '#8D6E63', fontSize: 13, letterSpacing: 1.5, fontFamily: 'serif', fontWeight: 'bold' }}>
                            SONRAKİ BÖLÜM
                        </Text>
                        <Text style={{ color: '#3E2723', fontSize: 18, fontFamily: 'serif', textAlign: 'center', lineHeight: 26, fontStyle: 'italic' }}>
                            {nextSection.title}
                        </Text>
                        <View style={{ marginTop: 4, opacity: 0.8 }}>
                            <Ionicons name="chevron-down" size={20} color="#5D4037" />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#5D4037', fontSize: 16, fontFamily: 'serif', fontStyle: 'italic' }}>
                            ~ Kitap Sonu ~
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={{
                        paddingVertical: 12,
                        alignItems: 'center',
                        opacity: 0.7 // Subtle secondary action
                    }}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: '#8D6E63', fontSize: 14, fontFamily: 'serif' }}>
                        Tüm İçindekiler
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }, [isSectionMode, nextSection, effectiveWorkId, navigation, route.params?.workTitle]);

    // V25.2: Show error state - user should never see wrong page
    if (targetError) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Ionicons name="alert-circle-outline" size={48} color="#B3261E" />
                <Text style={{ marginTop: 12, color: '#B3261E', fontSize: 16, fontWeight: '600' }}>
                    {targetError}
                </Text>
                <Text style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
                    İçindekiler sayfasına dönülüyor...
                </Text>
            </SafeAreaView>
        );
    }

    // NO-FLASH: Block rendering until position resolved
    if (isLoading || !stream || !isReadyToRender) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#B3261E" />
                <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>
                    {isLoading ? 'Yükleniyor...' : 'Sayfa hazırlanıyor...'}
                </Text>
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
                    <Text style={styles.headerTitle} numberOfLines={1}>{currentSectionTitle}</Text>
                    <Text style={styles.headerSub}>
                        {currentPageNumber > 0 ? `${currentPageNumber} / ${totalPages}` : ''}
                    </Text>
                </View>

                {/* Menu Button - Controlled UI */}
                <ReaderMoreMenuButton
                    lugatEnabled={lugatEnabled}
                    onLugatToggle={handleToggleLugat}
                    onRestartBook={handleRestartBook}
                />
            </View>

            <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={pinchGesture}>
                    <View style={{ flex: 1 }}>
                        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                            <FlashList
                                ref={flatListRef}
                                data={stream}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                estimatedItemSize={200}
                                overrideItemLayout={(layout: any, item) => {
                                    layout.size = getItemSize(item);
                                }}
                                removeClippedSubviews={false}
                                onViewableItemsChanged={onViewableItemsChanged}
                                viewabilityConfig={viewabilityConfig}
                                contentContainerStyle={styles.listContent}
                                onScrollBeginDrag={onScrollBegin}
                                onMomentumScrollBegin={onScrollBegin}
                                onScrollEndDrag={onScrollEnd}
                                onMomentumScrollEnd={onScrollEnd}
                                ListFooterComponent={renderFooter}
                                extraData={hydratedItemId}
                                onScrollToIndexFailed={(info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
                                    // V25.1: Retry with backoff (max 3 attempts)
                                    scrollRetryCountRef.current += 1;
                                    const attempt = scrollRetryCountRef.current;

                                    console.log('[Reader] V25.1: onScrollToIndexFailed', {
                                        index: info.index,
                                        attempt,
                                        highestMeasured: info.highestMeasuredFrameIndex
                                    });

                                    if (attempt <= MAX_SCROLL_RETRIES) {
                                        // Backoff: 100ms, 200ms, 300ms
                                        const delay = attempt * 100;
                                        setTimeout(() => {
                                            if (flatListRef.current) {
                                                // Try scrollToOffset first as fallback
                                                const estimatedOffset = info.index * info.averageItemLength;
                                                flatListRef.current.scrollToOffset({ offset: estimatedOffset, animated: false });
                                                // Then try scrollToIndex
                                                setTimeout(() => {
                                                    flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                                                }, 50);
                                            }
                                        }, delay);
                                    } else {
                                        // Max retries exceeded - mark as ready anyway
                                        console.warn('[Reader] V25.1: Max scroll retries exceeded, marking ready anyway');
                                        didRestoreRef.current = true;
                                        setIsReadyToRender(true);
                                        pendingScrollIndexRef.current = null;
                                    }
                                }}
                            />
                        </Animated.View>
                        <LugatOverlay ref={lugatRef} />
                    </View>
                </GestureDetector>
            </GestureHandlerRootView>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF6E3' },
    center: { justifyContent: 'center', alignItems: 'center' },
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
    pageContainer: { paddingHorizontal: 16, paddingVertical: 8 },

    // Section Headers (Book-like aesthetic)
    sectionHeader: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        alignItems: 'center',
        marginVertical: 8,
    },
    mainHeader: {
        backgroundColor: '#FDF6E3', // Match reader background
        paddingVertical: 24,
    },
    subHeader: {
        backgroundColor: '#FDF6E3',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#D4A574',
    },
    headerDecorTop: {
        width: 60,
        height: 2,
        backgroundColor: '#B8860B',
        marginBottom: 12,
        borderRadius: 1,
    },
    headerDecorBottom: {
        width: 40,
        height: 2,
        backgroundColor: '#B8860B',
        marginTop: 12,
        borderRadius: 1,
    },
    sectionHeaderText: {
        fontWeight: 'bold',
        fontFamily: 'serif',
    },
    mainHeaderText: {
        fontSize: 22,
        color: '#5D4037',
        textAlign: 'center',
        letterSpacing: 1,
    },
    subHeaderText: {
        fontSize: 16,
        color: '#795548',
        fontStyle: 'italic',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    modalClose: { padding: 4 },
    tocList: { padding: 16 },
    tocItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tocItemText: { fontSize: 16, color: '#334155', fontWeight: '500' },
    tocSubItem: {
        paddingVertical: 10,
        paddingLeft: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tocSubItemText: { fontSize: 14, color: '#64748B' },

    // Footnotes
    footnoteSection: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#D4A574',
    },
});
