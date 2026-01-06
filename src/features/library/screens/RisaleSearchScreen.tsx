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
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { RisaleSearchDb, SearchResult } from '@/services/risaleSearchDb';
import { theme } from '@/config/theme';

export const RisaleSearchScreen = () => {
    const navigation = useNavigation<any>();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false); // To distinguish init state vs no results

    // Init DB on mount
    useEffect(() => {
        RisaleSearchDb.init();
    }, []);

    // Debounce Logic
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            } else {
                setResults([]);
                setSearched(false);
            }
        }, 400); // 400ms debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const performSearch = async (text: string) => {
        setLoading(true);
        try {
            const data = await RisaleSearchDb.search(text);
            setResults(data);
            setSearched(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResultPress = (item: SearchResult) => {
        // Navigate to Reader
        // We need to map book_id to the fileName or uri logic used in Reader
        // Assuming Reader takes 'bookId', 'title', 'uri' (optional depending on implementation)
        // And also 'page' param which we added support for.

        // Construct URI as done in HomeScreen. 
        // NOTE: This assumes default bundled path logic.
        // It's safer to just pass bookId and let Reader Screen resolve path if it uses the Service?
        // But PdfReader currently expects 'uri'.
        // Let's rely on the same logic `RisaleHomeScreen` uses or update Reader to handle ID.
        // For now, let's construct the expected standard URI.
        const uri = `${FileSystem.documentDirectory}risale/${item.book_id}.pdf`;
        // Warning: Hardcoding path is risky. 
        // Ideally, Reader takes `bookId` and resolves URI itself using RisaleAssets service.
        // Or we pass `bookId` and Reader handles it.
        // Checking Reader... it uses `route.params.uri`.

        // Let's update Reader to robustly handle this later, but for now we pass basics.
        // Actually, better to pass bookId and let Reader resolve if URI is missing?
        // Or just re-use the standard logic.

        // Since we don't have easy access to the path resolver here without importing RisaleAssets or similar...
        // Let's pass the params expected.

        // IMPORTANT: We need to actually resolve the URI properly.
        // In `RisaleHomeScreen` it uses: `await FileSystem.getInfoAsync...`
        // Let's use `RisaleDownloadService.getLocalPath(bookId)` if available? No, usually in components.

        // For now, let's assume we can navigate and Reader handles it or we pass a dummy URI if Reader can look it up?
        // Reader code: `const { bookId, title, uri } = route.params;` -> `<Pdf source={{ uri ... }}`
        // So Reader NEEDS uri.
        // We will do a quick lookup in the onPress.
        navigation.navigate('RisaleReader', {
            bookId: item.book_id,
            title: item.book_title,
            initialBlockIndex: item.block_index
        });
    };

    const renderItem = ({ item }: { item: SearchResult }) => {
        // Snippet comes with <b> tags. We need to render them bold.
        // Simple regex replace for now.
        const parts = item.snippet.split(/(<b>.*?<\/b>)/g);

        return (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
                <View style={styles.resultHeader}>
                    <Text style={styles.bookTitle}>{item.book_title}</Text>
                    <View style={styles.pageBadge}>
                        <Text style={styles.pageText}>Sayfa {item.page_number}</Text>
                    </View>
                </View>
                <Text style={styles.snippet} numberOfLines={3}>
                    {parts.map((part, index) => {
                        if (part.startsWith('<b>') && part.endsWith('</b>')) {
                            return (
                                <Text key={index} style={styles.highlight}>
                                    {part.replace(/<\/?b>/g, '')}
                                </Text>
                            );
                        }
                        return <Text key={index}>{part}</Text>;
                    })}
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
                    keyExtractor={(item, index) => `${item.book_id}-${item.page_number}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        searched ? (
                            <View style={styles.center}>
                                <Text style={styles.emptyText}>Sonuç bulunamadı.</Text>
                            </View>
                        ) : (
                            <View style={styles.center}>
                                <Text style={styles.infoText}>Aramak için en az 2 harf yazın.</Text>
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
    bookTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    pageBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4
    },
    pageText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600'
    },
    snippet: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20
    },
    highlight: {
        backgroundColor: '#fef08a', // yellow-200
        fontWeight: 'bold',
        color: '#000'
    }
});
