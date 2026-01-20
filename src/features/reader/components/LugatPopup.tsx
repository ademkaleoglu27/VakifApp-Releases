/**
 * LugatPopup.tsx
 * Tabbed popup component for dictionary lookup with AI fallback.
 * 
 * Features:
 * - "Lugat" tab: Shows deterministic dictionary results
 * - "AI Açıklama" tab: Shows AI-powered explanation (when enabled)
 * - "Öneriler" section: Shows fuzzy matches and variants
 * - Disclaimer label for AI results
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DictionaryEntry } from '@/services/dictionaryDb';
import {
    getLugatSuggestions,
    getAILugatExplanation,
    getDisplayVariants,
    type LugatSuggestion,
    type AILugatResponse
} from '@/services/ai-assist';
import { TelemetryService } from '@/services/TelemetryService';
import {
    ENABLE_AI_ASSIST_LUGAT,
    ENABLE_LUGAT_SUGGESTIONS
} from '@/config/features';

// ============================================================================
// TYPES
// ============================================================================

interface LugatPopupProps {
    visible: boolean;
    onClose: () => void;

    // Primary search result (from existing dictionaryDb.searchFlexible)
    entry: DictionaryEntry | null;
    candidates: DictionaryEntry[];

    // Context for AI fallback
    searchedWord: string;
    sentence?: string;
    bookRef?: string;

    // Callbacks
    onSelectCandidate: (entry: DictionaryEntry) => void;
}

type TabKey = 'lugat' | 'ai';

// ============================================================================
// COMPONENT
// ============================================================================

export const LugatPopup: React.FC<LugatPopupProps> = ({
    visible,
    onClose,
    entry,
    candidates,
    searchedWord,
    sentence,
    bookRef,
    onSelectCandidate,
}) => {
    // State
    const [activeTab, setActiveTab] = useState<TabKey>('lugat');
    const [suggestions, setSuggestions] = useState<LugatSuggestion[]>([]);
    const [aiResponse, setAiResponse] = useState<AILugatResponse | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(entry);

    // Derived state
    const hasExactMatch = entry !== null;
    const hasCandidates = candidates.length > 0;
    const showNotFound = !hasExactMatch && !hasCandidates && suggestions.length === 0;
    const showAITab = ENABLE_AI_ASSIST_LUGAT && !hasExactMatch;

    // Reset state when popup opens/closes
    useEffect(() => {
        if (visible) {
            setActiveTab('lugat');
            setSelectedEntry(entry);
            setAiResponse(null);
            setSuggestions([]);

            // Load suggestions if no exact match
            if (!hasExactMatch && ENABLE_LUGAT_SUGGESTIONS) {
                loadSuggestions();
            }

            // Log telemetry if nothing found
            if (!hasExactMatch && !hasCandidates) {
                TelemetryService.logLookupMiss(searchedWord, bookRef);
            }
        }
    }, [visible, searchedWord]);

    // Load suggestions using AI Assist service
    const loadSuggestions = useCallback(async () => {
        if (!searchedWord) return;

        try {
            const results = await getLugatSuggestions(searchedWord, 5);
            setSuggestions(results);

            if (results.length > 0) {
                TelemetryService.log({
                    type: 'lookup_suggestion_shown',
                    word: searchedWord,
                    suggestionCount: results.length
                });
            }
        } catch (error) {
            console.error('[LugatPopup] Error loading suggestions:', error);
        }
    }, [searchedWord]);

    // Load AI explanation when AI tab is selected
    const loadAIExplanation = useCallback(async () => {
        if (!ENABLE_AI_ASSIST_LUGAT || aiResponse || aiLoading) return;

        setAiLoading(true);
        try {
            const response = await getAILugatExplanation({
                word: searchedWord,
                sentence: sentence || '',
                bookRef: bookRef,
                normalizedVariants: getDisplayVariants(searchedWord),
            });

            setAiResponse(response);

            if (response) {
                TelemetryService.logAIFallbackUsed('lugat', searchedWord);
            }
        } catch (error) {
            console.error('[LugatPopup] Error loading AI explanation:', error);
        } finally {
            setAiLoading(false);
        }
    }, [searchedWord, sentence, bookRef, aiResponse, aiLoading]);

    // Handle tab change
    const handleTabChange = useCallback((tab: TabKey) => {
        setActiveTab(tab);
        if (tab === 'ai' && !aiResponse && !aiLoading) {
            loadAIExplanation();
        }
    }, [aiResponse, aiLoading, loadAIExplanation]);

    // Handle candidate selection
    const handleCandidateSelect = useCallback((candidate: DictionaryEntry) => {
        setSelectedEntry(candidate);
        onSelectCandidate(candidate);

        TelemetryService.log({
            type: 'lookup_suggestion_selected',
            word: searchedWord,
            selectedWord: candidate.word_tr
        });
    }, [searchedWord, onSelectCandidate]);

    // Handle suggestion selection
    const handleSuggestionSelect = useCallback((suggestion: LugatSuggestion) => {
        setSelectedEntry(suggestion.entry);
        onSelectCandidate(suggestion.entry);

        TelemetryService.log({
            type: 'lookup_suggestion_selected',
            word: searchedWord,
            selectedWord: suggestion.entry.word_tr
        });
    }, [searchedWord, onSelectCandidate]);

    // Render entry detail view
    const renderEntryDetail = () => {
        if (!selectedEntry) return null;

        return (
            <>
                <View style={styles.entryHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.wordOsm}>{selectedEntry.word_osm}</Text>
                        <Text style={styles.wordTr}>{selectedEntry.word_tr}</Text>
                    </View>
                    {(hasCandidates || suggestions.length > 0) && (
                        <TouchableOpacity
                            onPress={() => setSelectedEntry(null)}
                            style={styles.backBtn}
                        >
                            <Text style={styles.backBtnText}>Listeye Dön</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.separator} />
                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator>
                    <Text style={styles.definition}>{selectedEntry.definition}</Text>
                </ScrollView>
            </>
        );
    };

    // Render candidate/suggestion list
    const renderList = () => {
        const allItems = [
            ...candidates.map(c => ({ entry: c, score: 100, matchType: 'exact' as const })),
            ...suggestions.filter(s => !candidates.some(c => c.id === s.entry.id))
        ];

        if (allItems.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>
                        Lügatta bulunamadı:{"\n"}"{searchedWord}"
                    </Text>
                    {ENABLE_AI_ASSIST_LUGAT && (
                        <TouchableOpacity
                            style={styles.tryAIBtn}
                            onPress={() => handleTabChange('ai')}
                        >
                            <Ionicons name="sparkles" size={16} color="#fff" />
                            <Text style={styles.tryAIText}>AI Açıklama Dene</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        return (
            <>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Sonuçlar: "{searchedWord}"</Text>
                    <Text style={styles.listSubtitle}>Lütfen bir kelime seçin:</Text>
                </View>
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator>
                    {allItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.entry.id || index}
                            style={styles.listItem}
                            onPress={() => handleSuggestionSelect(item)}
                        >
                            <Text style={styles.itemOsm}>{item.entry.word_osm}</Text>
                            <View style={styles.itemRight}>
                                <Text style={styles.itemTr}>{item.entry.word_tr}</Text>
                                {item.matchType !== 'exact' && (
                                    <View style={styles.matchBadge}>
                                        <Text style={styles.matchBadgeText}>
                                            {item.matchType === 'normalized' ? 'normalize' :
                                                item.matchType === 'variant' ? 'varyant' :
                                                    item.matchType === 'alias' ? 'ilişkili' : 'yakın'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </>
        );
    };

    // Render AI tab content
    const renderAITab = () => {
        if (aiLoading) {
            return (
                <View style={styles.aiLoading}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.aiLoadingText}>AI açıklama hazırlanıyor...</Text>
                </View>
            );
        }

        if (!aiResponse) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>AI açıklama yüklenemedi</Text>
                </View>
            );
        }

        return (
            <View style={styles.aiContent}>
                <View style={styles.disclaimerBanner}>
                    <Ionicons name="information-circle" size={16} color="#64748b" />
                    <Text style={styles.disclaimerText}>{aiResponse.disclaimer}</Text>
                </View>

                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
                    <Text style={styles.aiExplanation}>{aiResponse.explanation}</Text>
                </ScrollView>

                {aiResponse.suggestedEntries && aiResponse.suggestedEntries.length > 0 && (
                    <View style={styles.suggestedSection}>
                        <Text style={styles.suggestedTitle}>İlgili maddeler:</Text>
                        <View style={styles.suggestedChips}>
                            {aiResponse.suggestedEntries.map((entry, i) => (
                                <View key={i} style={styles.chip}>
                                    <Text style={styles.chipText}>{entry}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Render tabs
    const renderTabs = () => {
        if (!showAITab) return null;

        return (
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'lugat' && styles.tabActive]}
                    onPress={() => handleTabChange('lugat')}
                >
                    <Ionicons
                        name="book"
                        size={18}
                        color={activeTab === 'lugat' ? '#6366f1' : '#94a3b8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'lugat' && styles.tabTextActive]}>
                        Lugat
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
                    onPress={() => handleTabChange('ai')}
                >
                    <Ionicons
                        name="sparkles"
                        size={18}
                        color={activeTab === 'ai' ? '#6366f1' : '#94a3b8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
                        AI Açıklama
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.content} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {selectedEntry ? selectedEntry.word_tr : `"${searchedWord}"`}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close-circle" size={32} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Content */}
                    <View style={styles.body}>
                        {activeTab === 'lugat' ? (
                            selectedEntry ? renderEntryDetail() : renderList()
                        ) : (
                            renderAITab()
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 320,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
    },
    closeBtn: {
        padding: 4,
    },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginHorizontal: 16,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#6366f1',
    },
    tabText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
        color: '#94a3b8',
    },
    tabTextActive: {
        color: '#6366f1',
    },

    // Body
    body: {
        padding: 16,
        paddingBottom: 32,
    },

    // Entry Detail
    entryHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    wordOsm: {
        fontSize: 36,
        color: '#b45309',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginBottom: 4,
    },
    wordTr: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        letterSpacing: 0.5,
    },
    backBtn: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },
    backBtnText: {
        color: '#64748b',
        fontSize: 14,
    },
    separator: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 16,
    },
    definition: {
        fontSize: 17,
        color: '#334155',
        lineHeight: 28,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },

    // List
    listHeader: {
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    listSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    listItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemOsm: {
        fontSize: 20,
        color: '#b45309',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemTr: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    matchBadge: {
        marginLeft: 8,
        backgroundColor: '#e0f2fe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    matchBadgeText: {
        fontSize: 10,
        color: '#0284c7',
        fontWeight: '600',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 12,
        textAlign: 'center',
    },
    tryAIBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 16,
    },
    tryAIText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
    },

    // AI Tab
    aiLoading: {
        alignItems: 'center',
        padding: 32,
    },
    aiLoadingText: {
        marginTop: 12,
        color: '#64748b',
    },
    aiContent: {
        gap: 12,
    },
    disclaimerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    disclaimerText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#64748b',
        flex: 1,
    },
    aiExplanation: {
        fontSize: 16,
        color: '#334155',
        lineHeight: 26,
    },
    suggestedSection: {
        marginTop: 12,
    },
    suggestedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    suggestedChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    chipText: {
        fontSize: 14,
        color: '#475569',
    },
});

export default LugatPopup;
