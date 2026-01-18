// SearchResultsView.tsx - Search results display with navigation
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LibraryItem } from '../catalog/LibraryCatalog';

interface SearchResultsViewProps {
    results: LibraryItem[];
    query: string;
    onResultPress: (item: LibraryItem) => void;
    onClose: () => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
    results,
    query,
    onResultPress,
    onClose
}) => {
    if (!query.trim()) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>
                    "{query}" için {results.length} sonuç
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={24} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* Results */}
            {results.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                    <Text style={styles.emptySubtext}>Farklı bir kelime deneyin</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
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
                    )}
                    contentContainerStyle={styles.listContent}
                />
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b'
    },
    closeButton: {
        padding: 4
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32
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
        marginTop: 4
    },
    listContent: {
        padding: 16
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
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
    }
});
