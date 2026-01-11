import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar, Modal, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming } from 'react-native-reanimated';

import { buildReadingStream, buildTocIndexMap, getSectionsByWork, StreamItem } from '@/services/risaleRepo';
import { RisaleChunk, RisaleSection } from '@/types/risale';
import { RisaleTextRenderer } from '@/features/library/components/RisaleTextRenderer';

import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingProgressService } from '@/services/ReadingProgressService';

// Lugat Integration
import { LugatOverlay, LugatControlRef } from '@/features/library/components/LugatOverlay';
import { ReaderMoreMenuButton } from '@/features/reader/components/ReaderMoreMenuButton';
import { FootnoteToggle } from '@/features/reader/components/FootnoteToggle';

/**
 * RisaleVirtualPageReaderScreen (Diamond Standard V23.1 - LOCKED)
 * ─────────────────────────────────────────────────────────────
 * CONTINUOUS READING STREAM IMPLEMENTATION
 * 
 * Features:
 * 1. Full book stream (all sections in single FlashList)
 * 2. Book-like section headers (decorative dividers)
 * 3. TOC modal with accordion + jump navigation
 * 4. Dynamic header (current section + position counter)
 * 5. Progressive Hydration (only visible page interactive)
 * 6. Lugat integration with improved touch targets
 * 7. Pinch-to-zoom preserved
 * 8. Inline footnotes (collapsed, lazy fetch, local state)
 * 
 * LOCKED: Do not modify Virtual Page, Hydration, Zoom, or Footnote logic.
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

// TOC Modal Component
const TOCModal = React.memo(({
    visible,
    onClose,
    sections,
    onSelect
}: {
    visible: boolean,
    onClose: () => void,
    sections: RisaleSection[],
    onSelect: (sectionId: string) => void
}) => {
    // Group sections by parent for accordion display
    const groupedSections = useMemo(() => {
        const mainSections: { main: RisaleSection; children: RisaleSection[] }[] = [];
        const childMap = new Map<string, RisaleSection[]>();

        for (const section of sections) {
            if (section.parent_id) {
                if (!childMap.has(section.parent_id)) {
                    childMap.set(section.parent_id, []);
                }
                childMap.get(section.parent_id)!.push(section);
            }
        }

        for (const section of sections) {
            if (!section.parent_id && section.type === 'main') {
                mainSections.push({
                    main: section,
                    children: childMap.get(section.id) || []
                });
            }
        }

        return mainSections;
    }, [sections]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const toggleExpand = (sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>İçindekiler</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.tocList}>
                        {groupedSections.map((group) => {
                            const isExpanded = expandedSections.has(group.main.id);
                            const hasChildren = group.children.length > 0;

                            return (
                                <View key={group.main.id}>
                                    <TouchableOpacity
                                        style={styles.tocItem}
                                        onPress={() => {
                                            onSelect(group.main.id);
                                            onClose();
                                        }}
                                    >
                                        <Text style={styles.tocItemText}>{group.main.title}</Text>
                                        {hasChildren && (
                                            <TouchableOpacity onPress={() => toggleExpand(group.main.id)}>
                                                <Ionicons
                                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                                    size={18}
                                                    color="#0EA5E9"
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                    {isExpanded && group.children.map((child) => (
                                        <TouchableOpacity
                                            key={child.id}
                                            style={styles.tocSubItem}
                                            onPress={() => {
                                                onSelect(child.id);
                                                onClose();
                                            }}
                                        >
                                            <Text style={styles.tocSubItemText}>{child.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

export const RisaleVirtualPageReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { bookId, workId, sectionId: startSectionId, workTitle } = route.params;
    const effectiveWorkId = bookId || workId || 'sozler';
    const windowWidth = Dimensions.get('window').width;

    const [fontSize, setFontSize] = useState(18);
    const [currentSectionTitle, setCurrentSectionTitle] = useState(workTitle || 'Okuyucu');
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [tocVisible, setTocVisible] = useState(false);

    const flatListRef = useRef<any>(null);
    const fontSizeRef = useRef(fontSize);
    const currentItemRef = useRef(currentItemIndex);

    useEffect(() => {
        fontSizeRef.current = fontSize;
        currentItemRef.current = currentItemIndex;
    }, [fontSize, currentItemIndex]);

    // Lugat State
    const LUGAT_PREF_KEY = 'lugat_enabled_pref';
    const lugatEnabledRef = useRef(false);
    const [lugatEnabled, setLugatEnabled] = useState(false); // State to trigger re-render
    const lugatRef = useRef<LugatControlRef>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Hydration State
    const [hydratedItemId, setHydratedItemId] = useState<string | null>(null);

    // Load Lugat Pref
    useEffect(() => {
        AsyncStorage.getItem(LUGAT_PREF_KEY).then(val => {
            lugatEnabledRef.current = val === 'true';
        });
    }, []);

    // Fetch Stream
    const { data: stream, isLoading } = useQuery({
        queryKey: ['readingStream', effectiveWorkId],
        queryFn: () => buildReadingStream(effectiveWorkId),
    });

    // Fetch Sections for TOC
    const { data: tocSections } = useQuery({
        queryKey: ['sections', effectiveWorkId],
        queryFn: () => getSectionsByWork(effectiveWorkId),
    });

    // TOC Index Map
    const tocIndexMap = useMemo(() => {
        if (!stream) return new Map<string, number>();
        return buildTocIndexMap(stream);
    }, [stream]);

    // Hydrate first page item when stream loads
    useEffect(() => {
        if (stream && stream.length > 0 && !hydratedItemId) {
            // Find first page item (skip headers)
            const firstPage = stream.find(s => s.type === 'page');
            if (firstPage) {
                setHydratedItemId(firstPage.id);
            }
        }
    }, [stream, hydratedItemId]);

    // Initial Scroll to Section (if provided)
    useEffect(() => {
        if (!stream || !startSectionId) return;

        const targetIndex = tocIndexMap.get(startSectionId);
        if (targetIndex !== undefined && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
            }, 100);
        }
    }, [stream, startSectionId, tocIndexMap]);

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

    // Word Click (preserved)
    const handleWordClick = useCallback((word: string, chunkId: number, pageY: number) => {
        if (isScrollingRef.current) return;
        if (!lugatEnabledRef.current) return;
        lugatRef.current?.open(word, chunkId, pageY);
    }, []);

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

        // Update counter
        setCurrentItemIndex(topItem.orderIndex);

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
    }, [stream]);

    const handleTocSelect = useCallback((sectionId: string) => {
        const targetIndex = tocIndexMap.get(sectionId);
        if (targetIndex !== undefined && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: targetIndex, animated: true });
        }
    }, [tocIndexMap]);

    // Estimate item size based on type
    const getItemSize = useCallback((item: StreamItem) => {
        if (item.type === 'section_header') return 80;
        if (item.type === 'sub_header') return 60;
        // Page: estimate based on chunk count
        const chunkCount = item.chunks?.length || 0;
        return Math.max(200, chunkCount * 100);
    }, []);

    if (isLoading || !stream) {
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
                    <Text style={styles.headerTitle} numberOfLines={1}>{currentSectionTitle}</Text>
                    <Text style={styles.headerSub}>
                        {currentItemIndex + 1} / {stream.length}
                    </Text>
                </View>

                {/* TOC Button */}
                <TouchableOpacity onPress={() => setTocVisible(true)} style={styles.headerBtn}>
                    <Ionicons name="list" size={22} color="#0EA5E9" />
                </TouchableOpacity>

                {/* Menu Button */}
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
                                extraData={hydratedItemId}
                                onScrollToIndexFailed={(info: { index: number }) => {
                                    // Fallback: try again after layout
                                    setTimeout(() => {
                                        flatListRef.current?.scrollToIndex({
                                            index: info.index,
                                            animated: false
                                        });
                                    }, 100);
                                }}
                            />
                        </Animated.View>
                        <LugatOverlay ref={lugatRef} />
                    </View>
                </GestureDetector>
            </GestureHandlerRootView>

            {/* TOC Modal */}
            <TOCModal
                visible={tocVisible}
                onClose={() => setTocVisible(false)}
                sections={tocSections || []}
                onSelect={handleTocSelect}
            />
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
