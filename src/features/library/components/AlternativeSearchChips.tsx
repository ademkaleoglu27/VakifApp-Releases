/**
 * AlternativeSearchChips.tsx
 * Horizontal chip list for alternative search queries.
 * Shown when primary search returns no results.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchSuggestion } from '@/services/ai-assist';
import { TelemetryService } from '@/services/TelemetryService';

// ============================================================================
// TYPES
// ============================================================================

interface AlternativeSearchChipsProps {
    suggestions: SearchSuggestion[];
    originalQuery: string;
    onChipPress: (query: string) => void;
    relatedTopics?: string[];
    onTopicPress?: (topic: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AlternativeSearchChips: React.FC<AlternativeSearchChipsProps> = ({
    suggestions,
    originalQuery,
    onChipPress,
    relatedTopics,
    onTopicPress,
}) => {
    if (suggestions.length === 0 && (!relatedTopics || relatedTopics.length === 0)) {
        return null;
    }

    const handleChipPress = (suggestion: SearchSuggestion) => {
        TelemetryService.log({
            type: 'search_suggestion_selected',
            query: originalQuery,
            selectedQuery: suggestion.query
        });
        onChipPress(suggestion.query);
    };

    const handleTopicPress = (topic: string) => {
        if (onTopicPress) {
            TelemetryService.log({
                type: 'search_suggestion_selected',
                query: originalQuery,
                selectedQuery: topic
            });
            onTopicPress(topic);
        }
    };

    return (
        <View style={styles.container}>
            {/* Alternative Queries Section */}
            {suggestions.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="search-outline" size={16} color="#64748b" />
                        <Text style={styles.sectionTitle}>Alternatif Aramalar</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsContainer}
                    >
                        {suggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.chip,
                                    suggestion.matchType === 'alias' && styles.chipAlias,
                                    suggestion.matchType === 'stripped' && styles.chipStripped,
                                ]}
                                onPress={() => handleChipPress(suggestion)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.chipText}>
                                    {suggestion.displayLabel || suggestion.query}
                                </Text>
                                {suggestion.matchType === 'alias' && (
                                    <View style={styles.chipBadge}>
                                        <Text style={styles.chipBadgeText}>ilişkili</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Related Topics Section */}
            {relatedTopics && relatedTopics.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="pricetag-outline" size={16} color="#64748b" />
                        <Text style={styles.sectionTitle}>İlgili Konular</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsContainer}
                    >
                        {relatedTopics.map((topic, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.chip, styles.chipTopic]}
                                onPress={() => handleTopicPress(topic)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, styles.chipTextTopic]}>
                                    {topic}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Hint Text */}
            <View style={styles.hintContainer}>
                <Ionicons name="information-circle-outline" size={14} color="#94a3b8" />
                <Text style={styles.hintText}>
                    Bir öneriye tıklayarak yeni arama yapabilirsiniz
                </Text>
            </View>
        </View>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    section: {
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginLeft: 6,
    },
    chipsContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingRight: 16,
    },
    chip: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chipAlias: {
        borderColor: '#c7d2fe',
        backgroundColor: '#eef2ff',
    },
    chipStripped: {
        borderColor: '#bbf7d0',
        backgroundColor: '#f0fdf4',
    },
    chipTopic: {
        backgroundColor: '#fef3c7',
        borderColor: '#fcd34d',
    },
    chipText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    chipTextTopic: {
        color: '#92400e',
    },
    chipBadge: {
        marginLeft: 6,
        backgroundColor: '#c7d2fe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    chipBadgeText: {
        fontSize: 10,
        color: '#4338ca',
        fontWeight: '600',
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    hintText: {
        fontSize: 12,
        color: '#94a3b8',
        marginLeft: 4,
    },
});

export default AlternativeSearchChips;
