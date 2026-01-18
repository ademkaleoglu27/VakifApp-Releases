import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { HTML_BOOKS, HtmlBook, HtmlChapter } from '@/features/reader/html/htmlManifest.generated';

export const RisaleHtmlReaderHomeScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const bookId = route.params?.bookId;

    const selectedBook = bookId ? HTML_BOOKS[bookId] : null;

    // RENDER: BOOK LIST (If no book selected)
    const renderBookItem = ({ item }: { item: HtmlBook }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.push('RisaleHtmlReaderHome', { bookId: item.id })}
        >
            <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="book" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.chapters.length} Bölüm • HTML Pilot</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    // RENDER: CHAPTER LIST (If book selected)
    const renderChapterItem = ({ item }: { item: HtmlChapter }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RisaleHtmlReader', {
                assetPath: item.assetPath,
                title: item.title,
                bookId: selectedBook?.id,
                chapterId: item.id
            })}
        >
            <View style={styles.iconContainer}>
                {/* Extract number if possible, or show index */}
                <Text style={styles.indexText}>{item.title.split(' ')[1] || '#'}</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{selectedBook?.title} • Sayfa {item.startPage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    const title = selectedBook ? selectedBook.title : "HTML Reader Pilot";
    const data = selectedBook ? selectedBook.chapters : Object.values(HTML_BOOKS);
    const renderItem = selectedBook ? renderChapterItem : renderBookItem;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="flask-outline" size={20} color="#b45309" />
                <Text style={styles.infoText}>
                    {selectedBook
                        ? `${selectedBook.title} kitabı görüntüleniyor. Gerçek HTML işleme kullanılmaktadır.`
                        : "Test etmek istediğiniz kitabı seçin. Bu modül deneyseldir (V2)."}
                </Text>
            </View>

            <FlatList
                data={data}
                renderItem={renderItem as any}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backButton: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    infoBox: { flexDirection: 'row', margin: 16, padding: 12, backgroundColor: '#fff7ed', borderRadius: 8, borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center' },
    infoText: { marginLeft: 12, color: '#7c2d12', fontSize: 13, lineHeight: 18, flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    indexText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    textContainer: { flex: 1 },
    title: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#64748b' },
});
