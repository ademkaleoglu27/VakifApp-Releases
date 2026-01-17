import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    SafeAreaView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { searchParagraphs, RisaleSearchResult } from '@/services/risaleRepo';
import { theme } from '@/config/theme';

export const RisaleSearchScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [query, setQuery] = useState(route.params?.initialQuery || '');
    const [results, setResults] = useState<RisaleSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            } else {
                setResults([]);
                setSearched(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const performSearch = async (text: string) => {
        setLoading(true);
        try {
            const data = await searchParagraphs(text, 30);
            setResults(data);
            setSearched(true);
        } catch (error) {
            console.error('[Search] Error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleResultPress = useCallback((item: RisaleSearchResult) => {
        Keyboard.dismiss();

        // DEPRECATED: Legacy route removed
        Alert.alert(
            'Okuyucu Kullanılamıyor',
            'Bu okuyucu devre dışı bırakılmıştır. Lütfen ana menüden Kütüphane → Risale-i Nur → Sözler akışını kullanın.',
            [{ text: 'Tamam' }]
        );
    }, [navigation]);

    const highlightQuery = (text: string, q: string) => {
        if (!q || q.length < 2) return text;

        const index = text.toLowerCase().indexOf(q.toLowerCase());
        if (index === -1) return text;

        // Get surrounding context
        const start = Math.max(0, index - 60);
        const end = Math.min(text.length, index + q.length + 60);
        let snippet = text.substring(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        return snippet;
    };

    const renderItem = ({ item }: { item: RisaleSearchResult }) => {
        const snippet = highlightQuery(item.snippet, query);

        return (
            <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleResultPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.resultHeader}>
                    <Text style={styles.workTitle}>{item.workTitle}</Text>
                    <Text style={styles.sectionTitle}>{item.sectionTitle}</Text>
                </View>
                <Text style={styles.snippet} numberOfLines={3}>
                    {snippet}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.input}
                        placeholder="Risale-i Nur'da Ara..."
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item, index) => `${item.sectionId}-${item.chunkIndex}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        searched ? (
                            <View style={styles.center}>
                                <Ionicons name="search-outline" size={48} color="#ccc" />
                                <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                            </View>
                        ) : (
                            <View style={styles.center}>
                                <Ionicons name="book-outline" size={48} color="#ccc" />
                                <Text style={styles.infoText}>Aramak için en az 2 harf yazın</Text>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 12
    },
    backButton: {
        padding: 4
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        gap: 8
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333'
    },
    listContent: {
        padding: 16
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40
    },
    infoText: {
        color: '#666',
        fontSize: 14
    },
    emptyText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500'
    },
    resultItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    workTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    sectionTitle: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500'
    },
    snippet: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginTop: 4
    },
});
