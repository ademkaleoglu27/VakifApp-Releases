import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { RisaleUserDb, RisaleBookmark, RisaleNote } from '@/services/risaleUserDb';
import { theme } from '@/config/theme';
import * as FileSystem from 'expo-file-system';
import { RISALE_BOOKS } from '@/config/risaleSources';

export const RisaleMyNotesScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const [activeTab, setActiveTab] = useState<'bookmarks' | 'notes'>('bookmarks');
    const [bookmarks, setBookmarks] = useState<RisaleBookmark[]>([]);
    const [notes, setNotes] = useState<RisaleNote[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const b = await RisaleUserDb.getBookmarks();
            const n = await RisaleUserDb.getNotes();
            setBookmarks(b);
            setNotes(n);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadData();
        }
    }, [isFocused]);

    const getBookTitle = (bookId: string) => {
        const book = RISALE_BOOKS.find(b => b.id === bookId);
        return book ? book.title : bookId;
    };

    const handlePress = (bookId: string, pageNumber: number) => {
        // Resolve URI
        const uri = `${FileSystem.documentDirectory}risale/${bookId}.pdf`;
        const title = getBookTitle(bookId);

        navigation.navigate('RisalePdfReader', {
            bookId,
            title,
            uri,
            initialPage: pageNumber
        });
    };

    const handleDeleteNote = async (id: string) => {
        Alert.alert(
            "Notu Sil",
            "Bu notu silmek istediğinize emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        await RisaleUserDb.deleteNote(id);
                        loadData();
                    }
                }
            ]
        );
    };

    const renderBookmark = ({ item }: { item: RisaleBookmark }) => (
        <TouchableOpacity style={styles.card} onPress={() => handlePress(item.book_id, item.page_number)}>
            <View style={styles.cardHeader}>
                <View style={styles.bookBadge}>
                    <Ionicons name="book" size={12} color="#fff" />
                    <Text style={styles.bookBadgeText}>{getBookTitle(item.book_id)}</Text>
                </View>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
            <View style={styles.cardContent}>
                <Ionicons name="bookmark" size={24} color={theme.colors.secondary} />
                <Text style={styles.pageText}>Sayfa {item.page_number}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderNote = ({ item }: { item: RisaleNote }) => (
        <TouchableOpacity style={styles.card} onPress={() => handlePress(item.book_id, item.page_number)}>
            <View style={styles.cardHeader}>
                <View style={[styles.bookBadge, { backgroundColor: theme.colors.secondary }]}>
                    <Ionicons name="book" size={12} color="#fff" />
                    <Text style={styles.bookBadgeText}>{getBookTitle(item.book_id)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteNote(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
            <Text style={styles.noteContent}>{item.content}</Text>
            <View style={styles.noteFooter}>
                <Text style={styles.pageTextSmall}>Sayfa {item.page_number}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notlarım & İşaretlerim</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'bookmarks' && styles.activeTab]}
                    onPress={() => setActiveTab('bookmarks')}
                >
                    <Ionicons name={activeTab === 'bookmarks' ? "bookmark" : "bookmark-outline"} size={20} color={activeTab === 'bookmarks' ? theme.colors.primary : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.activeTabText]}>Ayraçlar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
                    onPress={() => setActiveTab('notes')}
                >
                    <Ionicons name={activeTab === 'notes' ? "create" : "create-outline"} size={20} color={activeTab === 'notes' ? theme.colors.primary : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>Notlar</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={(activeTab === 'bookmarks' ? bookmarks : notes) as any[]}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={activeTab === 'bookmarks' ? renderBookmark : renderNote as any}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>Henüz kayıt yok.</Text>
                        </View>
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
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent'
    },
    activeTab: {
        borderBottomColor: theme.colors.primary
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#666'
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40
    },
    list: {
        padding: 16
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    bookBadge: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 6
    },
    bookBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    date: {
        fontSize: 12,
        color: '#999'
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    pageText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333'
    },
    noteContent: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        marginBottom: 12
    },
    noteFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 8
    },
    pageTextSmall: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600'
    },
    emptyText: {
        color: '#666'
    }
});
