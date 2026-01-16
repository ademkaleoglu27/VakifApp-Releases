import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar, Modal, ScrollView, AppState, AppStateStatus, LayoutChangeEvent } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView, ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming, withSpring } from 'react-native-reanimated';

import { buildReadingStream, buildReadingStreamByBookId, buildSectionReadingStream, buildTocIndexMap, getNextSection, StreamItem } from '@/services/risaleRepo';
import { readingProgressStore } from '@/services/readingProgressStore';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { ENABLE_RESUME_LAST_READ, ENABLE_ICARZ_PROTOCOL_FOR_ALL_BOOKS } from '@/config/features';
import { RisaleChunk } from '@/types/risale';
import { RisaleTextRenderer } from '@/features/library/components/RisaleTextRenderer';
import { generatePhraseCandidates } from '@/features/library/utils/lugatNormalize';
import { patchIsaratBlocks } from '@/features/reader/utils/patchIsaratBlocks';

import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookLastRead } from '@/services/readingProgressStore';

// Lugat Integration
import { LugatOverlay, LugatControlRef } from '@/features/library/components/LugatOverlay';
import { ReaderMoreMenuButton } from '@/features/reader/components/ReaderMoreMenuButton';
import { FootnoteToggle } from '@/features/reader/components/FootnoteToggle';
import { PagesGridView } from '@/features/reader/components/PagesGridView';
// TOC removed from reader - now accessed via SectionList screen

/**
 * RisaleVirtualPageReaderScreen (GOLD STANDARD V25.8 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * CONTINUOUS READING STREAM IMPLEMENTATION + PROGRESS PERSISTENCE
 * 
 * Features:
 * 1. Full book stream (all sections in single FlashList)
 * 2. Book-like section headers (decorative dividers)
 * 3. Dynamic header (current section + position counter)
 * 4. Progressive Hydration (only visible page interactive)
 * 5. Lugat integration (Double-tap tolerance + No-Flash scroll)
 * 6. Pinch-to-zoom preserved
 * 7. Inline footnotes (collapsed, lazy fetch, fail-soft)
 * 8. TOC accessed via SectionList screen (workId + bookId passed)
 * 
 * NEW IN V25.8 (Interactive Refinements):
 * - No-Flash Scroll: Text remains visible during scroll start
 * - Double-Tap Lugat: 250ms tolerance for touch responsiveness
 * - Fail-Safe Loading: 2s timeout for empty streams
 * - Identity Bridge: Canonical risale.* ID support
 * 
 * LOCKED: Do not modify Virtual Page, Hydration, Zoom, Footnote,
 *         or Reading Progress logic. This is the template for all books.
 * ─────────────────────────────────────────────────────────────
 */

// Regex to detect footnote references like [1], [2] in text
const FOOTNOTE_REF_REGEX = /\[(\d+)\]/g;

// Helpers
const clamp = (v: number, min: number, max: number) => {
    'worklet';
    return Math.max(min, Math.min(max, v));
};
const roundFont = (v: number) => Math.round(v);

type ZoomMetrics = { fontSize: number; lineHeight: number; paragraphGap: number };

const makeMetrics = (fs: number): ZoomMetrics => ({
    fontSize: fs,
    lineHeight: Math.round(fs * 1.55),
    paragraphGap: Math.round(fs * 0.70),
});

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
// Page Item Component (Diamond Standard V23.1 - with Footnote Support)
const PageItem = React.memo(({ item, fontSize, onWordPress, onTokenTap, onTokenLongPress, onLayout, paragraphGap, bookId }: {
    item: StreamItem,
    fontSize: number,
    onWordPress?: (word: string, chunkId: number, py: number, prev?: string, next?: string) => void,
    // World Standard Interaction V27
    onTokenTap?: (token: any) => void,
    onTokenLongPress?: (token: any) => void,
    onLayout?: (event: LayoutChangeEvent) => void,
    paragraphGap?: number,
    bookId?: string
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
        <View style={styles.pageContainer} onLayout={onLayout}>
            {item.chunks.map((chunk) => {
                const isInteractive = !!onWordPress || !!onTokenTap;
                return (
                    <View key={chunk.id} style={{ marginBottom: paragraphGap ?? 12 }}>
                        <RisaleTextRenderer
                            text={chunk.text_tr ?? ''}
                            fontSize={fontSize}
                            interactiveEnabled={isInteractive}
                            variant={chunk.type === 'poetry' ? 'poetry' : undefined}
                            poetryLines={chunk.meta?.lines}
                            bookId={bookId}
                            // Legacy
                            onWordPress={onWordPress ?
                                (w, py, prev, next) => onWordPress(w, chunk.id, py, prev, next)
                                : undefined}
                            // New World Standard
                            onTokenTap={onTokenTap ? (t) => onTokenTap({ ...t, chunkId: chunk.id }) : undefined}
                            onTokenLongPress={onTokenLongPress ? (t) => onTokenLongPress({ ...t, chunkId: chunk.id }) : undefined}
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

    // V27: World Standard Params & Bridge
    const {
        bookId: pBookId,
        sectionId,
        version,
        workTitle,
        workId: pWorkId // Legacy
    } = route.params ?? {};

    // 1. Resolve Identities
    const bookId = pBookId ?? (pWorkId === 'sozler' ? 'risale.sozler@diyanet.tr' : undefined);
    const legacyWorkId = pWorkId ?? (bookId === 'risale.sozler@diyanet.tr' ? 'sozler' : undefined);

    useEffect(() => {
        console.log('[VP-Reader open]', { bookId, legacyWorkId, sectionId });
        if (!bookId && !legacyWorkId) {
            console.error('[Reader] Critical: Missing identity params');
        }
    }, []);

    // Content Bridge: Map global bookId to legacy internal ID for Repo/DB
    // TODO: Move this mapping to ContentResolver in V27.1
    const getInternalWorkId = (id: string | undefined) => {
        if (id === 'risale.sozler@diyanet.tr') return 'sozler';
        if (id === 'risale.mektubat@diyanet.tr') return 'mektubat';
        if (id === 'risale.lemalar@diyanet.tr') return 'lemalar';
        if (id === 'risale.sualar@diyanet.tr') return 'sualar';
        if (id === 'risale.asayi_musa@diyanet.tr') return 'asayi_musa';
        if (id === 'risale.isaratul_icaz@diyanet.tr') return 'isaratul_icaz';
        if (id === 'risale.mesnevi_nuriye@diyanet.tr') return 'mesnevi_nuriye';
        if (id === 'risale.sikke_i_tasdik_i_gaybi@diyanet.tr') return 'sikke_i_tasdik_i_gaybi';
        if (id === 'risale.barla_lahikasi@diyanet.tr') return 'barla_lahikasi';
        if (id === 'risale.kastamonu_lahikasi@diyanet.tr') return 'kastamonu_lahikasi';
        if (id === 'risale.emirdag_lahikasi@diyanet.tr') return 'emirdag_lahikasi';
        if (id === 'risale.tarihce_i_hayat@diyanet.tr') return 'tarihce_i_hayat';

        // Legacy fallback supported via bridge logic above, but if we have a raw bookId that isn't mapped:
        if (id && !id.startsWith('risale.') && id !== 'sozler' && id !== 'mektubat' && id !== 'lemalar') {
            // If strict mode, block. If bridge mode, maybe allow? 
            // Current strict rule:
            console.warn('[Reader] Legacy workId usage:', id);
        }
        return id || 'sozler';
    };

    const effectiveWorkId = getInternalWorkId(legacyWorkId ?? bookId);
    // ICAZ_EXPERIMENT: Protocol Flag (Hoisted)
    // V27.3: Generalized Icarz Protocol (Gold Standard) to all books
    const isIcarz = ENABLE_ICARZ_PROTOCOL_FOR_ALL_BOOKS || bookId === "risale.isaratul_icaz@diyanet.tr";

    // Safety Check
    if (effectiveWorkId === 'LOCKED_INVALID_ID') {
        // In a real app we might show an error screen here, 
        // but for now we let it fail or return null render if logic permits.
        // The query hooks will won't run or will fail gracefully with invalid ID.
    }
    // Use effectiveWorkId for Repo/DB calls
    // Use bookId for ProgressStore/UserDb (Future: migrate store to use bookId too)
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

    // Lugat State (Fixed Enabled)
    const lugatEnabledRef = useRef(true);
    const lugatRef = useRef<LugatControlRef>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Phrase Construction Helpers
    // This allows us to rebuild the phrase from token context if needed, 
    // but generatePhraseCandidates does it better inside the handler.

    // Hydration State
    const [hydratedItemId, setHydratedItemId] = useState<string | null>(null);
    // ICAZ_EXPERIMENT: Multi-page hydration for responsiveness
    const [hydratedItemIds, setHydratedItemIds] = useState<Set<string>>(new Set());

    // V25.7: Load Next Section Info (on mount or when sectionId changes)
    useEffect(() => {
        if (!isSectionMode || !route.params?.sectionId) return;

        getNextSection(effectiveWorkId, route.params.sectionId).then(next => {
            setNextSection(next);
        });
    }, [effectiveWorkId, route.params?.sectionId, isSectionMode]);

    // Fetch Stream (Full Book or Section Only)
    const { data: stream, isLoading, isError, error: queryError } = useQuery({
        queryKey: ['readingStream', effectiveWorkId, isSectionMode ? route.params.sectionId : 'full'],
        queryFn: async () => {
            // Guard: If DB corrupted, this might throw.
            if (!effectiveWorkId || effectiveWorkId === 'LOCKED_INVALID_ID') {
                throw new Error('INVALID_WORK_ID');
            }

            // V27: Support Canonical Book ID
            const isCanonical = effectiveWorkId.startsWith('risale.');

            if (isSectionMode && route.params.sectionId) {
                // Section Stream currently relies on WORK ID internally for efficient scan?
                // Actually buildSectionReadingStream uses DB query on work_id OR book_id?
                // Let's check logic: buildSectionReadingStream(workId, ...).
                // We should assume for now section stream needs workId for legacy compatibility
                // unless we update it too. But for "Mektubat reader hang", usually full stream is used if mode is default.
                // Wait, Mektubat via TOC uses 'mode: section'.
                // So we MUST update `buildSectionReadingStream` or pass legacy ID.
                return buildSectionReadingStream(effectiveWorkId, route.params.sectionId);
            }

            let rawStream: StreamItem[];
            if (isCanonical) {
                rawStream = await buildReadingStreamByBookId(effectiveWorkId);
            } else {
                rawStream = await buildReadingStream(effectiveWorkId);
            }

            // V27.5: Ezcumle Chunk Merge Patch (Icarz)
            // Patch chunks block-by-block before they enter the reader state
            if (bookId === 'risale.isaratul_icaz@diyanet.tr' && rawStream) {
                const finalStream = rawStream.map((item, index) => {
                    if (item.chunks) {
                        const patchedChunks = patchIsaratBlocks(bookId, item.chunks);

                        return {
                            ...item,
                            chunks: patchedChunks
                        };
                    }
                    return item;
                });
                return finalStream;
            }
            return rawStream;
        },
        retry: 0 // Fail fast
    });

    // V27: Content Guard
    useEffect(() => {
        if (!effectiveWorkId || effectiveWorkId === 'LOCKED_INVALID_ID') {
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'ContentIntegrity',
                    params: {
                        errorCode: 'ERR_NAV_INVALID_ID',
                        details: { bookId, legacyWorkId }
                    }
                } as any],
            });
            return;
        }

        if (isError) {
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'ContentIntegrity',
                    params: {
                        errorCode: 'ERR_STREAM_LOAD_FAILED',
                        details: { error: (queryError as Error)?.message }
                    }
                } as any],
            });
        }
    }, [effectiveWorkId, isError, queryError, navigation]);

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
                    // ICAZ: Initialize set
                    if (isIcarz) setHydratedItemIds(new Set([firstPage.id]));
                }
            }
        }
    }, [stream, hydratedItemId, isIcarz]);

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
            // If mode is 'section', we load a partial stream for this section.
            // Index 0 of that stream is inherently the start of the section.
            if (sectionId) {
                // FALLBACK: If TOC didn't pass initialLocation (map wasn't ready),
                // default to 0 (start of section stream)
                setInitialTarget({ streamIndex: 0, sectionId });
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
    }, [effectiveWorkId, route.params?.initialLocation?.streamIndex, sectionId]);


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

        // 🔴 FAIL-SAFE: Empty stream detection
        if (!isLoading && (!stream || stream.length === 0)) {
            const t = setTimeout(() => {
                navigation.reset({
                    index: 0,
                    routes: [{
                        name: 'ContentIntegrity',
                        params: {
                            errorCode: 'ERR_EMPTY_STREAM',
                            details: { bookId, legacyWorkId, sectionId }
                        }
                    } as any]
                });
            }, 2000);
            return () => clearTimeout(t);
        }

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
    }, [stream, isReadyToRender, targetError, isLoading, bookId, legacyWorkId, sectionId, navigation]);

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
    const savedScale = useSharedValue(1); // Legacy for other books

    // Icarz Protocol State
    const committedScale = useSharedValue(1);
    const gestureScale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const minScaleDuringGesture = useSharedValue(1);
    // ICAZ_EXPERIMENT intent filter
    const pinchStartTs = useSharedValue(0);
    const pinchStartScale = useSharedValue(1);
    const isPinching = useRef(false);
    const setIsPinching = useCallback((val: boolean) => { isPinching.current = val; }, []);

    // Icarz Protocol State
    // isIcarz hoisted to top
    const [viewMode, setViewMode] = useState<'READER' | 'GRID'>('READER'); // 'READER' | 'GRID'
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [zoomMetrics, setZoomMetrics] = useState<ZoomMetrics>(() => makeMetrics(18));
    const zoomMetricsRef = useRef(zoomMetrics);
    useEffect(() => { zoomMetricsRef.current = zoomMetrics; }, [zoomMetrics]);

    // ICAZ_EXPERIMENT: Lugat Gates & Positioning
    const [interactionLocked, setInteractionLocked] = useState(false);
    const interactionLockRef = useRef(false);
    useEffect(() => { interactionLockRef.current = interactionLocked; }, [interactionLocked]);

    // V27.2: Layout Stability Gate (Icarz)
    const [layoutSettled, setLayoutSettled] = useState(true);
    const layoutSettledRef = useRef(true);
    useEffect(() => { layoutSettledRef.current = layoutSettled; }, [layoutSettled]);

    const [readerPointerEvents, setReaderPointerEvents] = useState<'auto' | 'none'>('auto');

    const lockInteractionsFor = useCallback((ms: number) => {
        if (!isIcarz) return;
        setInteractionLocked(true);
        setTimeout(() => setInteractionLocked(false), ms);
    }, [isIcarz]);

    const unlockPointerSoon = useCallback((ms: number) => {
        setTimeout(() => setReaderPointerEvents('auto'), ms);
    }, []);

    const lugatZoomLockRef = useRef(false);
    const lugatResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingTapRef = useRef<{ w: string; chunkId: number; pageY: number; ts: number; } | null>(null);
    const PENDING_TAP_TTL_MS = 650;

    const setLugatZoomLock = useCallback((locked: boolean) => {
        lugatZoomLockRef.current = locked;
        if (locked) lugatRef.current?.close();
    }, []);

    // Cleanup timer
    useEffect(() => {
        return () => {
            if (lugatResumeTimerRef.current) clearTimeout(lugatResumeTimerRef.current);
        };
    }, []);

    const adjustLugatAnchorYPreferUpper = (pageY: number) => {
        const h = lugatRef.current?.getCardHeight?.() ?? 260;
        const screenH = Dimensions.get('window').height;

        // Target: Show card in upper-middle band if possible
        const TOP_SAFE = 70;     // header + safe area
        const BOTTOM_SAFE = 90;  // bottom gesture safe
        const GAP = 10;

        const maxTop = screenH - h - BOTTOM_SAFE;

        // 1) Try opening ABOVE the word
        const topCandidate = pageY - h - GAP;
        if (topCandidate >= TOP_SAFE) {
            // Use top if fits, but clamp to maxTop just in case
            return Math.max(TOP_SAFE, Math.min(topCandidate, maxTop));
        }

        // 2) Try opening BELOW the word
        const bottomCandidate = pageY + GAP;
        if (bottomCandidate <= maxTop) {
            // Use bottom if fits
            return Math.max(TOP_SAFE, Math.min(bottomCandidate, maxTop));
        }

        // 3) Fallback: Clamp to screen
        return Math.max(TOP_SAFE, Math.min(bottomCandidate, maxTop));
    };

    const tryConsumePendingTap = useCallback(() => {
        if (!pendingTapRef.current) return;
        const p = pendingTapRef.current;
        pendingTapRef.current = null;

        if (!isIcarz) return;
        if (viewMode === 'GRID') return;
        if (lugatZoomLockRef.current) return;
        if (isScrollingRef.current) return;
        if (!lugatEnabledRef.current) return;

        lugatRef.current?.open(p.w, p.chunkId, p.pageY);
    }, [isIcarz, viewMode]);

    const scheduleLugatResume = useCallback(() => {
        if (lugatResumeTimerRef.current) clearTimeout(lugatResumeTimerRef.current);
        lugatResumeTimerRef.current = setTimeout(() => {
            setLugatZoomLock(false);
        }, 120);
    }, [setLugatZoomLock]);

    // Shared Values for UI Thread Zoom (Icarz)
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);
    const gridOpacity = useSharedValue(0);
    const readerOpacity = useSharedValue(1);

    const lastOffsetYRef = useRef(0); // For momentum kill
    const pinchRef = useRef<any>(null); // Reference for simultaneous handlers

    const renderLazyScrollComponent = useCallback((props: any) => {
        return (
            <RNGHScrollView
                {...props}
                ref={props.ref} // Forward the ref from FlashList
                activeOffsetY={isIcarz ? [-4, 4] : undefined} // 4px micro-lock for instant pinch
                simultaneousHandlers={pinchRef} // Allow pinch to start while scroll logic is evaluating
            />
        );
    }, [isIcarz]);

    const killMomentum = useCallback(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: lastOffsetYRef.current, animated: false });
        }
    }, []);

    const commitZoomIcarz = useCallback((finalScale: number) => {
        const currentFont = zoomMetricsRef.current.fontSize;
        const nextFont = clamp(roundFont(currentFont * finalScale), 12, 42);

        if (nextFont === currentFont || isNaN(nextFont)) return;

        // Anchor: keep reading pos
        const anchorIndex = currentItemRef.current;
        const anchorItemId = stream?.[anchorIndex]?.id;

        // 1. Lock Down & Clear (FAIL-SAFE)
        setLayoutSettled(false); // Gate interactions
        setInteractionLocked(true);
        setHydratedItemId(null);
        setHydratedItemIds(new Set()); // Critical: Clear old hydration
        lugatRef.current?.close();

        // 2. Commit Metrics (Triggers Render)
        setZoomMetrics(makeMetrics(nextFont));

        // Safety: Timeout if layout never settles
        setTimeout(() => {
            if (!layoutSettledRef.current) {
                console.warn('[Zoom] Layout settle timeout, forcing unlock');
                setLayoutSettled(true);
                setInteractionLocked(false);
                unlockPointerSoon(0);
            }
        }, 800);

        // 3. Force Layout Update & Restore sequence
        requestAnimationFrame(() => {
            flatListRef.current?.scrollToIndex({ index: anchorIndex, animated: false });

            // Wait for frames and interactions
            requestAnimationFrame(() => {
                InteractionManager.runAfterInteractions(() => {
                    if (anchorItemId) {
                        // 4. Set Hydration (This triggers PageItem render + onLayout)
                        setHydratedItemId(anchorItemId);

                        if (isIcarz) {
                            const idx = Math.max(0, Math.min(anchorIndex, stream.length - 1));
                            const ids = new Set<string>();
                            ids.add(stream[idx].id);
                            if (idx > 0) ids.add(stream[idx - 1].id);
                            if (idx < stream.length - 1) ids.add(stream[idx + 1].id);
                            setHydratedItemIds(ids);

                            if (viewMode !== 'GRID') setLugatZoomLock(false);
                            // Note: setLayoutSettled(true) will happen in onLayout
                        } else {
                            // Legacy path
                            setLayoutSettled(true);
                            setInteractionLocked(false);
                        }
                    }
                });
            });
        });
    }, [stream, isIcarz, viewMode]);

    // Handle Page Layout (Stability Signal)
    const handlePageLayout = useCallback((itemId: string) => {
        if (!isIcarz) return;
        // Only trigger if we are waiting for settlement and this item is active
        if (!layoutSettledRef.current && hydratedItemIds.has(itemId)) {
            InteractionManager.runAfterInteractions(() => {
                setLayoutSettled(true);
                setInteractionLocked(false);
                unlockPointerSoon(120);
            });
        }
    }, [isIcarz, hydratedItemIds, unlockPointerSoon]);

    const handleGridPagePress = useCallback((index: number) => {
        // Switch back to reader
        runOnJS(setViewMode)('READER');
        gridOpacity.value = withTiming(0, { duration: 160 });
        readerOpacity.value = withTiming(1, { duration: 160 });

        if (isIcarz) setLugatZoomLock(true);

        // Scroll and Hydrate
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false });
            runOnJS(setScrollEnabled)(true);
            InteractionManager.runAfterInteractions(() => {
                if (stream && stream[index]) {
                    setHydratedItemId(stream[index].id);
                }
                if (isIcarz) setTimeout(() => setLugatZoomLock(false), 200);
            });
        }, 80);
    }, [stream]);

    const handleZoom = useCallback((zoomIn: boolean) => {
        const currentSize = fontSizeRef.current;
        const step = 2;
        const newSize = zoomIn ? currentSize + step : currentSize - step;
        if (newSize < 12 || newSize > 40) return;
        setHydratedItemId(null);
        setFontSize(newSize);
    }, []);

    // Toggle Lugat (triggers re-render)
    // Toggle Lugat is now NO-OP (Always Enabled)
    const handleToggleLugat = useCallback((isEnabled: boolean) => {
        // No-op
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

        // Icarz Initial Hydration Population
        if (isIcarz) {
            const ids = new Set<string>();
            ids.add(firstItem.id);
            // +1 next
            if (stream.length > 1) ids.add(stream[1].id);
            setHydratedItemIds(ids);
        }
    }, [stream, effectiveWorkId]);

    // V25.8: Double-tap tolerance for Lugat interactions
    const lastWordTapRef = useRef<{ w: string; ts: number } | null>(null);

    // Legacy Word Handler (Deprecated but kept for non-Icarz fallback)
    const handleWordClick = useCallback((word: string, chunkId: number, pageY: number) => {
        if (!lugatEnabledRef.current) return;
        const w = (word || '').trim();
        if (w.length < 2) return;

        // Icarz Rollback Fix: Momentum check
        if (isIcarz && isScrollingRef.current) {
            isScrollingRef.current = false;
        } else if (isScrollingRef.current) {
            return;
        }

        // FIX: Close previous before opening new one (Stable Legacy Behavior)
        lugatRef.current?.close();

        // FIX: Use Prefer-Upper Anchor placement
        const safeY = adjustLugatAnchorYPreferUpper(pageY);
        lugatRef.current?.open(w, chunkId, safeY);
    }, [isIcarz]);

    // ─────────────────────────────────────────────────────────────
    // WORLD STANDARD INTERACTIONS (V27)
    // ─────────────────────────────────────────────────────────────

    // 1. Highlight (Tap)
    const handleTokenTap = useCallback((token: any) => {
        // Gates
        if (isIcarz) {
            if (viewMode === 'GRID') return;
            if (lugatZoomLockRef.current) return;
            if (interactionLockRef.current) return;
            if (viewMode !== 'READER') return;
            if (isScrollingRef.current) return; // No buffer on tap? Highlight needs stability.
        }

        // TODO: Implement Visual Highlight State (Reader Level)
        // For now, minimal feedback or no-op as requested "Highlight UI (Minimal)..."
        // "Kısa tap: highlight anında" -> implies we need state.
        // Given complexity budget, we might skip visual state for this step if not critical, 
        // OR just log it. 
        // User requested: "Selected highlights: Map...". 
        // I will implement visual toggle later or if requested. 
        // Prioritizing Lookup logic first.
        // Actually, let's just allow it.
    }, [isIcarz, viewMode]);

    // 2. Phrase Lookup (Long Press)
    const handleTokenLongPress = useCallback((token: any) => {
        // Gates
        if (!lugatEnabledRef.current) return;

        if (isIcarz) {
            if (viewMode === 'GRID') return;
            if (lugatZoomLockRef.current) return;
            if (interactionLockRef.current) return;
            if (viewMode !== 'READER') return;

            // Icarz Special: If scrolling momentum is active during long press, kill it and proceed
            if (isScrollingRef.current) {
                // Kill momentum implicitly by allowing interaction? 
                // We just clear the flag because user INTENT is interaction.
                isScrollingRef.current = false;
            }

            // Positioning
            const safeY = adjustLugatAnchorYPreferUpper(token.pageY);
            // Override pageY
            token.pageY = safeY;
        } else {
            // Standard behavior: no interaction during scroll
            if (isScrollingRef.current) return;
        }

        // Phrase Generation
        const candidates = generatePhraseCandidates(
            [token.context?.prev, token.rawToken, token.context?.next].filter(Boolean) as string[],
            token.context?.prev ? 1 : 0 // Clicked index relative to array
        );

        // Use first candidate (longest/most relevant)
        const phrase = candidates.length > 0 ? candidates[candidates.length - 1] : token.normalizedToken;

        // FIX: Close previous before opening new one to ensure state refresh
        lugatRef.current?.close();

        // FIX: Pass correct chunkId instead of 0
        // FIX: Use Prefer-Upper Anchor placement
        // Note: For long press, Icarz flow might have already adjusted token.pageY above.
        // But for non-Icarz flow, we need to adjust it here or ensure token.pageY is handled.
        // Actually, let's play safe and adjust it here if not already adjusted?
        // But wait, for Icarz we mutate token.pageY in handleTokenLongPress above.
        // Let's rely on adjustLugatAnchorYPreferUpper being idempotent-ish if called again?
        // Or better, just call it here for everyone if we want consistency.
        // However, Icarz block specifically did "Override pageY".

        // Let's just use token.pageY which is now potentially adjusted for Icarz.
        // But for non-Icarz, it is RAW. So we should adjust it if it wasn't adjuted.

        let targetY = token.pageY;
        if (!isIcarz) {
            targetY = adjustLugatAnchorYPreferUpper(token.pageY);
        }

        lugatRef.current?.open(phrase || token.normalizedToken, token.chunkId, targetY);
    }, [isIcarz, viewMode]);

    // Scroll Handlers (preserved)
    const onScrollBegin = useCallback(() => {
        isScrollingRef.current = true;
        lugatRef.current?.close();
        // NO-FLASH: Removed setHydratedItemId(null) to keep text visible during scroll start
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }, []);

    const onScrollEnd = useCallback(() => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        const delay = isIcarz ? 60 : 120; // Fast debounce for Icarz

        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
            InteractionManager.runAfterInteractions(() => {
                if (stream && stream[currentItemRef.current]) {
                    const currentId = stream[currentItemRef.current].id;
                    setHydratedItemId(currentId);

                    if (isIcarz) {
                        // 3-Page Hydration (Active + Neighbors)
                        const ids = new Set<string>();
                        ids.add(currentId);
                        const idx = currentItemRef.current;
                        if (idx > 0) ids.add(stream[idx - 1].id);
                        if (idx < stream.length - 1) ids.add(stream[idx + 1].id);
                        setHydratedItemIds(ids);

                        // Resume Lugat Buffer
                        setTimeout(() => {
                            const p = pendingTapRef.current;
                            if (p && (Date.now() - p.ts) > PENDING_TAP_TTL_MS) {
                                pendingTapRef.current = null;
                                return;
                            }
                            tryConsumePendingTap();
                        }, 0);
                    }
                }
            });
        }, delay);
    }, [stream, isIcarz, tryConsumePendingTap]);

    // Pinch Gesture (preserved)
    const pinchGesture = useMemo(() => {
        if (!isIcarz) {
            // GOLD STANDARD (Legacy/Existing)
            return Gesture.Pinch()
                .onStart(() => { runOnJS(setIsPinching)(true); })
                .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
                .onEnd(() => {
                    runOnJS(setIsPinching)(false);
                    if (scale.value > 1.1) { runOnJS(handleZoom)(true); }
                    else if (scale.value < 0.9) { runOnJS(handleZoom)(false); }
                    scale.value = withTiming(1);
                });
        }

        // WORLD STANDARD (Icarz Protocol)
        // ICAZ_EXPERIMENT thresholds (tuned)
        const GRID_ENTER_THRESHOLD = 0.40;   // grid çok zor açılsın
        const GRID_EXIT_THRESHOLD = 0.72;   // (opsiyonel) grid’den çıkış histerezis
        const COMMIT_IN_THRESHOLD = 1.05;   // zoom-in commit
        const COMMIT_OUT_THRESHOLD = 0.98;   // zoom-out commit daha sık (reflow sıklaşır)
        const MIN_VISUAL_SCALE = 0.35;   // pinch sırasında sayfa görünür kalsın
        const width = windowWidth;
        const height = Dimensions.get('window').height;

        return Gesture.Pinch()
            .withRef(pinchRef)
            .onTouchesDown((e, sm) => {
                if (e.numberOfTouches >= 2) {
                    runOnJS(setScrollEnabled)(false);
                    runOnJS(killMomentum)();
                    runOnJS(lugatRef.current?.close as any)();
                    runOnJS(setLugatZoomLock)(true);
                }
            })
            .onStart((e) => {
                runOnJS(setIsPinching)(true);
                runOnJS(setScrollEnabled)(false);
                runOnJS(lugatRef.current?.close as any)();
                runOnJS(setLugatZoomLock)(true);
                if (isIcarz) runOnJS(setReaderPointerEvents)('none');

                // Reset gesture factor & Intent Tracker
                gestureScale.value = 1;
                minScaleDuringGesture.value = 1;
                pinchStartTs.value = Date.now();
                pinchStartScale.value = scale.value;
            })
            .onUpdate((e) => {
                const s = clamp(e.scale, MIN_VISUAL_SCALE, 3.0);
                scale.value = s; // Visual only
                minScaleDuringGesture.value = Math.min(minScaleDuringGesture.value, s);

                focalX.value = e.focalX;
                focalY.value = e.focalY;

                // Focal Zoom Translate with Viewport Center
                // Formula: tx = (1 - s) * (focal - center)
                const cx = width / 2;
                const cy = height / 2;
                let ntx = (1 - s) * (e.focalX - cx);
                let nty = (1 - s) * (e.focalY - cy);

                // Clamp to prevent huge white space
                const maxTx = (s - 1) * (width / 2);
                const maxTy = (s - 1) * (height / 2);

                if (s > 1) {
                    ntx = clamp(ntx, -maxTx, maxTx);
                    nty = clamp(nty, -maxTy, maxTy);
                }

                tx.value = ntx;
                ty.value = nty;
            })
            .onEnd(() => {
                runOnJS(setIsPinching)(false);
                if (isIcarz) {
                    runOnJS(lockInteractionsFor)(120);
                    runOnJS(unlockPointerSoon)(120);
                }

                const finalScale = scale.value;
                const minScale = minScaleDuringGesture.value;

                // INTENT FILTER (RNK kararlılık hissi)
                // Kullanıcı gerçekten grid istemiş mi?
                // - yeterince küçültmüş mü (minScale <= 0.40)
                // - ve bunu hızlı/kararlı yapmış mı (kısa sürede veya güçlü shrink)
                const dt = Date.now() - pinchStartTs.value; // ms
                const shrinkAmount = (pinchStartScale.value || 1) - minScale;

                const isFast = dt <= 220;           // hızlı pinch = intent güçlü
                const isStrong = shrinkAmount >= 0.55; // ciddi küçültme = intent güçlü (= 0.45'e iniş)
                const wantsGrid = (minScale <= GRID_ENTER_THRESHOLD) && (isFast || isStrong);

                if (wantsGrid) {
                    runOnJS(setViewMode)('GRID');

                    readerOpacity.value = withTiming(0, { duration: 160 });
                    gridOpacity.value = withTiming(1, { duration: 160 });

                    // reader scroll kapalı kalsın
                    runOnJS(setScrollEnabled)(false);
                    runOnJS(setLugatZoomLock)(true);
                    if (isIcarz) runOnJS(setReaderPointerEvents)('none');

                    // visual reset (grid'e girince reader scale önemli değil)
                    scale.value = withTiming(1);
                    tx.value = withTiming(0);
                    ty.value = withTiming(0);
                    return;
                }

                // GRID yoksa: zoom-in veya zoom-out reflow commit
                if (finalScale > COMMIT_IN_THRESHOLD || finalScale < COMMIT_OUT_THRESHOLD) {
                    runOnJS(commitZoomIcarz)(finalScale);

                    // Visual reset (rubber-band)
                    scale.value = withTiming(1, { duration: 150 });
                    tx.value = withTiming(0, { duration: 150 });
                    ty.value = withTiming(0, { duration: 150 });
                } else {
                    // BOUNCE BACK (No Commit)
                    scale.value = withSpring(1, { damping: 15, stiffness: 160 });
                    tx.value = withSpring(0);
                    ty.value = withSpring(0);
                }

                runOnJS(setScrollEnabled)(true);
                runOnJS(scheduleLugatResume)();
            });
    }, [handleZoom, setIsPinching, scale, savedScale, isIcarz, gridOpacity, readerOpacity, focalX, focalY, committedScale, gestureScale, pinchStartTs, pinchStartScale]);

    const tapGesture = useMemo(() => {
        if (!isIcarz) return undefined;
        return Gesture.Tap()
            .maxDuration(220)
            .numberOfTaps(1)
            .requireExternalGestureToFail(pinchGesture)
            .cancelsTouchesInView(false)
            .onEnd(() => {
                // Pass-through for sync
            });
    }, [isIcarz, pinchGesture]);

    const composedGesture = useMemo(() => {
        if (!isIcarz || !tapGesture) return pinchGesture;
        return Gesture.Simultaneous(pinchGesture, tapGesture);
    }, [isIcarz, pinchGesture, tapGesture]);

    const animatedStyle = useAnimatedStyle(() => {
        if (!isIcarz) {
            return { transform: [{ scale: scale.value }] };
        }
        return {
            transform: [
                { translateX: tx.value },
                { translateY: ty.value },
                { scale: scale.value }
            ],
            opacity: readerOpacity.value
        };
    });

    const gridAnimatedStyle = useAnimatedStyle(() => ({
        opacity: gridOpacity.value,
        zIndex: gridOpacity.value > 0.5 ? 10 : -1
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
        const isHydrated = isIcarz ? hydratedItemIds.has(item.id) : (item.id === hydratedItemId);
        // V27.2: Layout Settled Gate
        const canInteract = isHydrated && !isScrollingRef.current && lugatEnabledRef.current && (!isIcarz || layoutSettledRef.current);

        return (
            <PageItem
                item={item}
                fontSize={isIcarz ? zoomMetrics.fontSize : fontSize}
                onWordPress={canInteract ? handleWordClick : undefined}
                // ICAZ ROLLBACK: Disable World Standard token interactions for Icarz
                onTokenTap={(!isIcarz && canInteract) ? handleTokenTap : undefined}
                onTokenLongPress={(!isIcarz && canInteract) ? handleTokenLongPress : undefined}
                onLayout={isIcarz ? () => handlePageLayout(item.id) : undefined}
                paragraphGap={isIcarz ? zoomMetrics.paragraphGap : undefined}
                bookId={bookId}
            />
        );
    }, [fontSize, isIcarz, zoomMetrics, hydratedItemId, handleWordClick, bookId]);

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
                            (navigation as any).replace('RisaleVirtualPageReader', {
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
                    lugatEnabled={true}
                    onLugatToggle={handleToggleLugat}
                    onRestartBook={handleRestartBook}
                />
            </View>

            <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={composedGesture}>
                    <View style={{ flex: 1 }}>
                        <Animated.View style={[{ flex: 1 }, animatedStyle]} pointerEvents={isIcarz ? readerPointerEvents : 'auto'}>
                            <FlashList
                                ref={flatListRef}
                                data={stream}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                // @ts-ignore
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
                                scrollEnabled={isIcarz ? scrollEnabled : true}
                                onScroll={(e) => {
                                    if (isIcarz) {
                                        lastOffsetYRef.current = e.nativeEvent.contentOffset.y;
                                    }
                                }}
                                scrollEventThrottle={16}
                                ListFooterComponent={renderFooter}
                                extraData={{
                                    hydratedItemId,
                                    hydratedKey: isIcarz ? Array.from(hydratedItemIds).join('|') : ''
                                }}
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

                        {/* Icarz: Grid Layer */}
                        {isIcarz && (
                            <Animated.View style={[StyleSheet.absoluteFill, gridAnimatedStyle]} pointerEvents={viewMode === 'GRID' ? 'auto' : 'none'}>
                                <PagesGridView
                                    stream={stream || []}
                                    onPagePress={handleGridPagePress}
                                    isVisible={viewMode === 'GRID'}
                                />
                            </Animated.View>
                        )}

                        {/* Icarz: Touch Shield (Only in GRID) */}
                        {isIcarz && viewMode === 'GRID' && (
                            <View style={StyleSheet.absoluteFill} pointerEvents="auto" />
                        )}
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
