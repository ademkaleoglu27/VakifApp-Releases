// SearchResultsView.tsx - Hybrid Search (Titles + Content)
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LibraryItem } from '../catalog/LibraryCatalog';
import { AlternativeSearchChips } from './AlternativeSearchChips';
import {
    getAlternativeQueries,
    getRelatedTopics,
    shouldShowSuggestions,
    type SearchSuggestion
} from '@/services/ai-assist';
import { TelemetryService } from '@/services/TelemetryService';
import { ENABLE_SEARCH_SUGGESTIONS } from '@/config/features';
import { SearchService, SearchResult } from '@/services/SearchService';
import { ReaderDatabase } from '@/services/ReaderDatabase';
import { HTML_BOOKS } from '@/features/reader/html/htmlManifest.generated';
import { canonicalizeBookId } from '@/services/bookId';
import { getBookById } from '@/config/booksRegistry';

interface SearchResultsViewProps {
    results: LibraryItem[];  // Catalog results (book/chapter titles)
    query: string;
    onResultPress: (item: LibraryItem) => void;
    onClose: () => void;
    onSearchAgain?: (newQuery: string) => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
    results,
    query,
    onResultPress,
    onClose,
    onSearchAgain
}) => {
    const navigation = useNavigation<any>();

    // State for alternative suggestions
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [relatedTopics, setRelatedTopics] = useState<string[]>([]);

    // State for content search
    const [contentResults, setContentResults] = useState<SearchResult[]>([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);

    // Perform FTS content search
    const performContentSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            setContentResults([]);
            return;
        }

        setContentLoading(true);
        setContentError(null);

        try {
            // Ensure database is initialized
            await ReaderDatabase.init();

            if (__DEV__) {
                console.log('[ContentSearch] Searching for:', searchQuery);
            }

            // Search ALL content (bundled + downloaded packs)
            const textResults = await SearchService.SEARCH_ALL(searchQuery, 15);

            if (__DEV__) {
                console.log('[ContentSearch] Found', textResults.length, 'results');
            }

            setContentResults(textResults);
        } catch (error: any) {
            console.error('[ContentSearch] Error:', error);
            // Don't show error if DB just isn't indexed yet
            if (!error.message?.includes('no such table')) {
                setContentError('İçerik araması başarısız');
            }
            setContentResults([]);
        } finally {
            setContentLoading(false);
        }
    }, []);

    // Perform content search when query changes
    useEffect(() => {
        performContentSearch(query);
    }, [query, performContentSearch]);

    // Load suggestions when both catalog and content results are empty
    useEffect(() => {
        const hasNoResults = results.length === 0 && contentResults.length === 0 && !contentLoading;

        if (hasNoResults && query.trim() && ENABLE_SEARCH_SUGGESTIONS) {
            // Log telemetry for empty results
            TelemetryService.logSearchNoResult(query);

            // Generate alternative suggestions
            if (shouldShowSuggestions(query)) {
                const alternativeQueries = getAlternativeQueries(query, 5);
                setSuggestions(alternativeQueries);

                const topics = getRelatedTopics(query, 3);
                setRelatedTopics(topics);

                if (alternativeQueries.length > 0) {
                    TelemetryService.log({
                        type: 'search_suggestion_shown',
                        query,
                        suggestionCount: alternativeQueries.length
                    });
                }
            }
        } else {
            setSuggestions([]);
            setRelatedTopics([]);
        }
    }, [results, contentResults, contentLoading, query]);

    // Handle chip press to search again
    const handleChipPress = (newQuery: string) => {
        if (onSearchAgain) {
            TelemetryService.log({
                type: 'search_suggestion_selected',
                query,
                selectedQuery: newQuery
            });
            onSearchAgain(newQuery);
        }
    };

    // Handle content result press - navigate directly to the section
    // Handle content result press - navigate directly to the section
    const handleContentResultPress = (result: SearchResult) => {
        // 1. Normalize DB ID (e.g. risale.barla_lahikasi -> barla)
        const shortId = canonicalizeBookId(result.bookId);

        // 2. Resolve to Full ID using Registry (barla -> risale.barla@diyanet.tr)
        // This is necessary because HTML_BOOKS uses full IDs as keys
        const registryEntry = getBookById(shortId);
        const fullBookId = registryEntry?.bookId || result.bookId;

        if (__DEV__) {
            console.log('[SearchResults] Navigating:', {
                raw: result.bookId,
                short: shortId,
                full: fullBookId,
                section: result.sectionId
            });
        }

        // 3. Find matching chapter in HTML_BOOKS
        const book = HTML_BOOKS[fullBookId];

        if (book && result.sectionId) {
            // Extract section number from sectionId like "sozler-section-003" → 3
            const sectionMatch = result.sectionId.match(/section-(\d+)/i);
            if (sectionMatch) {
                const sectionNum = parseInt(sectionMatch[1], 10);
                // Find chapter by index (1-based in sectionId, 0-based in array)
                const chapterIndex = sectionNum - 1;
                if (chapterIndex >= 0 && chapterIndex < book.chapters.length) {
                    const chapter = book.chapters[chapterIndex];
                    if (__DEV__) {
                        console.log('[SearchResults] Direct to chapter:', chapter.title);
                    }
                    // Navigate directly to reader with chapter
                    navigation.navigate('RisaleHtmlReader', {
                        assetPath: chapter.assetPath,
                        title: chapter.title,
                        bookId: fullBookId,
                        chapterId: chapter.id
                    });
                    onClose();
                    return;
                }
            }
        }

        // Fallback: Navigate to book TOC with FULL ID
        // Passing the full ID ensures RisaleHtmlReaderHomeScreen
        // finds the book in HTML_BOOKS and shows the chapter list, NOT the full book list.
        if (__DEV__) {
            console.log('[SearchResults] Fallback to book TOC:', fullBookId);
        }
        navigation.navigate('RisaleHtmlReaderHome', {
            bookId: fullBookId
        });
        onClose();
    };

    if (!query.trim()) return null;

    const totalResults = results.length + contentResults.length;
    const hasNoResults = totalResults === 0 && !contentLoading;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>
                    "{query}" için {contentLoading ? '...' : totalResults} sonuç
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={24} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* Loading indicator for content search */}
            {contentLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.loadingText}>İçerik aranıyor...</Text>
                </View>
            )}

            {/* Empty State with Suggestions */}
            {hasNoResults ? (
                <ScrollView
                    style={styles.emptyScrollView}
                    contentContainerStyle={styles.emptyScrollContent}
                >
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                        <Text style={styles.emptySubtext}>
                            {ENABLE_SEARCH_SUGGESTIONS && suggestions.length > 0
                                ? 'Aşağıdaki önerilerden birini deneyin'
                                : 'Farklı bir kelime deneyin'}
                        </Text>
                    </View>

                    {/* Alternative Search Suggestions */}
                    {ENABLE_SEARCH_SUGGESTIONS && (suggestions.length > 0 || relatedTopics.length > 0) && (
                        <AlternativeSearchChips
                            suggestions={suggestions}
                            originalQuery={query}
                            onChipPress={handleChipPress}
                            relatedTopics={relatedTopics}
                            onTopicPress={handleChipPress}
                        />
                    )}
                </ScrollView>
            ) : (
                <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator>
                    {/* Catalog Results (Book/Chapter Titles) */}
                    {results.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                <Ionicons name="library-outline" size={14} color="#64748b" /> Kitaplar
                            </Text>
                            {results.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.resultItem}
                                    onPress={() => onResultPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.resultIcon}>
                                        <Ionicons
                                            name={item.kind === 'big' ? 'book' : 'document-text'}
                                            size={20}
                                            color="#10b981"
                                        />
                                    </View>
                                    <View style={styles.resultInfo}>
                                        <Text style={styles.resultTitle}>{item.title}</Text>
                                        {item.subtitle && (
                                            <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Content Results (FTS Search in Text) */}
                    {contentResults.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                <Ionicons name="text-outline" size={14} color="#64748b" /> İçerik Sonuçları
                            </Text>
                            {contentResults.map((result, index) => (
                                <TouchableOpacity
                                    key={`content-${result.bookId}-${result.sectionId}-${index}`}
                                    style={styles.contentResultItem}
                                    onPress={() => handleContentResultPress(result)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.contentResultIcon}>
                                        <Ionicons name="document-text" size={18} color="#6366f1" />
                                    </View>
                                    <View style={styles.contentResultInfo}>
                                        <Text style={styles.contentResultBook}>{result.bookId}</Text>
                                        <Text
                                            style={styles.contentResultSnippet}
                                            numberOfLines={2}
                                        >
                                            {result.snippet
                                                .replace(/<b>/g, '')
                                                .replace(/<\/b>/g, '')
                                                .replace(/\.\.\./g, '…')}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Show suggestions if content results exist but catalog is empty */}
                    {results.length === 0 && contentResults.length > 0 && suggestions.length > 0 && (
                        <View style={styles.section}>
                            <AlternativeSearchChips
                                suggestions={suggestions}
                                originalQuery={query}
                                onChipPress={handleChipPress}
                                relatedTopics={relatedTopics}
                                onTopicPress={handleChipPress}
                            />
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FBF8F4',
        zIndex: 100
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 24,  // More space from top (below status bar)
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1
    },
    closeButton: {
        padding: 8,
        marginLeft: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8
    },
    loadingText: {
        fontSize: 13,
        color: '#64748b'
    },
    emptyScrollView: {
        flex: 1,
    },
    emptyScrollContent: {
        padding: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 16
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
        textAlign: 'center'
    },
    resultsScroll: {
        flex: 1,
        padding: 16
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    resultIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    resultInfo: {
        flex: 1
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b'
    },
    resultSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2
    },
    contentResultItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#6366f1'
    },
    contentResultIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    contentResultInfo: {
        flex: 1
    },
    contentResultBook: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366f1',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    contentResultSnippet: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20
    }
});
