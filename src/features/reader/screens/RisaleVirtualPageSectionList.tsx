import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSectionsByWork, buildReadingStream, buildSectionPageMap, SectionPageMapping } from '@/services/risaleRepo';
import { RisaleSection } from '@/types/risale';
import { readingProgressStore, BookLastRead } from '@/services/readingProgressStore';
import { RisaleUserDb, RisaleBookmark } from '@/services/risaleUserDb';
import { ENABLE_RESUME_LAST_READ } from '@/config/features';

interface GroupedSection {
    main: RisaleSection;
    children: RisaleSection[];
}

export const RisaleVirtualPageSectionList = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { workId, workTitle } = route.params;

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // Reading Progress & Bookmarks State
    const [lastRead, setLastRead] = useState<BookLastRead | null>(null);
    const [bookmarks, setBookmarks] = useState<RisaleBookmark[]>([]);

    const { data: sections, isLoading } = useQuery({
        queryKey: ['sections', workId],
        queryFn: () => getSectionsByWork(workId),
    });

    // Fetch stream for sectionPageMap (V25.1 deterministic target)
    const { data: stream } = useQuery({
        queryKey: ['readingStream', workId],
        queryFn: () => buildReadingStream(workId),
    });

    // Build section-to-page mapping for deterministic TOC navigation
    const sectionPageMap = useMemo(() => {
        if (!stream) return new Map<string, SectionPageMapping>();
        return buildSectionPageMap(stream);
    }, [stream]);

    // Group sections by parent
    const groupedSections = useMemo(() => {
        if (!sections) return [];

        const mainSections: GroupedSection[] = [];
        const childMap = new Map<string, RisaleSection[]>();

        // First pass: collect children
        for (const section of sections) {
            if (section.parent_id) {
                if (!childMap.has(section.parent_id)) {
                    childMap.set(section.parent_id, []);
                }
                childMap.get(section.parent_id)!.push(section);
            }
        }

        // Second pass: build grouped structure
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

    const navigateToSection = (section: RisaleSection) => {
        // V25.2: Deterministic target with firstPageIndex - use navigate (not push)
        const pageInfo = sectionPageMap.get(section.id);

        // If pageInfo not ready yet, wait - don't navigate with undefined firstPageIndex
        if (!pageInfo) {
            console.warn('[TOC] V25.2: sectionPageMap not ready for section', section.id);
            return;
        }

        // V25.6: Section-Only Mode (Guaranteed Navigation)
        navigation.navigate('RisaleVirtualPageReader', {
            bookId: workId,
            mode: 'section',
            source: 'toc',
            sectionId: section.id,
            sectionTitle: section.title,
            workTitle: workTitle,
        });
    };

    // Load reading progress and bookmarks on mount
    useEffect(() => {
        const loadProgressAndBookmarks = async () => {
            try {
                if (ENABLE_RESUME_LAST_READ) {
                    const savedLastRead = await readingProgressStore.getBookLastRead(workId);
                    setLastRead(savedLastRead);
                }

                const savedBookmarks = await RisaleUserDb.getBookmarks(workId);
                setBookmarks(savedBookmarks);
            } catch (e) {
                console.warn('[Contents] Failed to load progress/bookmarks', e);
            }
        };
        loadProgressAndBookmarks();
    }, [workId]);

    // Navigate to continue reading position
    // Navigate to continue reading position
    const handleContinueReading = () => {
        if (!lastRead) return;

        // V25.3: Resume Mode - use navigate and send explicit resume params
        navigation.navigate('RisaleVirtualPageReader', {
            bookId: workId,
            mode: 'resume',
            source: 'resume',
            resumeLocation: {
                streamIndex: lastRead.streamIndex,
                sectionId: lastRead.sectionId,
            },
            workTitle: workTitle,
        });
    };

    // Navigate to bookmark position
    const handleBookmarkPress = (bookmark: RisaleBookmark) => {
        // Bookmarks currently store page_number which maps to stream index
        // For VP reader, we use page_number as stream index approximation
        navigation.navigate('RisaleVirtualPageReader', {
            bookId: workId,
            workTitle: workTitle,
            initialLocation: {
                streamIndex: bookmark.page_number,
            },
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    // V25.4: Rollback - Hide Resume UI if disabled
    const showResumeCard = ENABLE_RESUME_LAST_READ && lastRead && lastRead.streamIndex > 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>{workTitle}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {/* Continue Reading Block */}
                {showResumeCard && lastRead && (
                    <TouchableOpacity style={styles.continueCard} onPress={handleContinueReading}>
                        <View style={styles.continueIcon}>
                            <Ionicons name="bookmark" size={20} color="#0EA5E9" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.continueTitle}>📌 Kaldığın Yer</Text>
                            <Text style={styles.continueSubtitle}>
                                Sayfa {lastRead.streamIndex + 1}'den devam et
                            </Text>
                        </View>
                        <Ionicons name="play-circle" size={28} color="#0EA5E9" />
                    </TouchableOpacity>
                )}

                {/* Bookmarks Block */}
                {bookmarks.length > 0 && (
                    <View style={styles.bookmarksSection}>
                        <Text style={styles.sectionTitle}>⭐ Yer İmleri ({bookmarks.length})</Text>
                        <FlatList
                            data={bookmarks}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bookmarkChip}
                                    onPress={() => handleBookmarkPress(item)}
                                >
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={styles.bookmarkText}>Sayfa {item.page_number}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Section Divider */}
                {(showResumeCard || bookmarks.length > 0) && (
                    <View style={styles.divider}>
                        <Text style={styles.dividerText}>İÇİNDEKİLER</Text>
                    </View>
                )}

                {groupedSections.map((group) => {

                    const isExpanded = expandedSections.has(group.main.id);
                    const hasChildren = group.children.length > 0;

                    return (
                        <View key={group.main.id}>
                            {/* Main Section */}
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => navigateToSection(group.main)}
                                onLongPress={() => hasChildren && toggleExpand(group.main.id)}
                            >
                                <View style={styles.itemIcon}>
                                    <Text style={styles.itemIndex}>{group.main.section_index}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemTitle}>{group.main.title}</Text>
                                    {hasChildren && (
                                        <Text style={styles.childCount}>
                                            {group.children.length} alt bölüm
                                        </Text>
                                    )}
                                </View>
                                {hasChildren && (
                                    <TouchableOpacity
                                        style={styles.expandBtn}
                                        onPress={() => toggleExpand(group.main.id)}
                                    >
                                        <Ionicons
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color="#0EA5E9"
                                        />
                                    </TouchableOpacity>
                                )}
                                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                            </TouchableOpacity>

                            {/* Child Sections (Collapsible) */}
                            {isExpanded && group.children.map((child) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={styles.subItem}
                                    onPress={() => navigateToSection(child)}
                                >
                                    <View style={styles.subItemIcon}>
                                        <Ionicons name="remove-outline" size={14} color="#94A3B8" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subItemTitle}>{child.title}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        flex: 1,
    },
    list: {
        padding: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    subItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 24,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        marginBottom: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#0EA5E9',
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    subItemIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    itemIndex: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0EA5E9',
    },
    itemTitle: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    subItemTitle: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '400',
    },
    childCount: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    expandBtn: {
        padding: 8,
        marginRight: 4,
    },

    // Continue Reading Card
    continueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#7DD3FC',
    },
    continueIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#BAE6FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    continueTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0369A1',
    },
    continueSubtitle: {
        fontSize: 12,
        color: '#0284C7',
        marginTop: 2,
    },

    // Bookmarks Section
    bookmarksSection: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    bookmarkChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    bookmarkText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#92400E',
    },

    // Divider
    divider: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginBottom: 8,
    },
    dividerText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        letterSpacing: 1,
    },
});
