import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList, SectionList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { HTML_BOOKS, HtmlBook, HtmlChapter } from '@/features/reader/html/htmlManifest.generated';
import { canonicalizeBookId } from '@/services/bookId';
import { CONTENT_PACK_CONFIG } from '@/config/booksRegistry';
import { getLastRead } from '@/services/readingProgress';

export const RisaleHtmlReaderHomeScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const bookId = route.params?.bookId;
    const didAutoNav = useRef(false);

    const selectedBook = bookId ? HTML_BOOKS[bookId] : null;

    // AUTO-NAVIGATE: Skip TOC and go directly to reader
    useEffect(() => {
        if (!selectedBook || didAutoNav.current) return;
        didAutoNav.current = true;

        const autoNavigate = async () => {
            const chapters = selectedBook.chapters;
            if (chapters.length === 0) return;

            // Check for last-read position
            const lastRead = await getLastRead(selectedBook.id);
            let targetChapter = chapters[0]; // Default: first chapter

            if (lastRead) {
                const found = chapters.find(c => c.id === lastRead.chapterId);
                if (found) {
                    targetChapter = found;
                    console.log(`[Reader] Resuming "${selectedBook.title}" from: ${found.title}`);
                }
            }

            navigation.replace('RisaleHtmlReader', {
                assetPath: targetChapter.assetPath,
                title: targetChapter.title,
                bookId: selectedBook.id,
                chapterId: targetChapter.id
            });
        };

        autoNavigate();
    }, [selectedBook]);

    // RENDER: BOOK LIST (If no book selected)
    const renderBookItem = ({ item }: { item: HtmlBook }) => {
        const canonicalId = canonicalizeBookId(item.id);
        const config = CONTENT_PACK_CONFIG[canonicalId];
        const isConfigured = !!config;

        return (
            <TouchableOpacity
                style={[styles.card, !isConfigured && styles.disabledCard]}
                onPress={() => {
                    if (isConfigured) {
                        navigation.push('RisaleHtmlReaderHome', { bookId: item.id });
                    }
                }}
                disabled={!isConfigured}
            >
                <View style={[styles.iconContainer, { backgroundColor: isConfigured ? '#e0f2fe' : '#f1f5f9' }]}>
                    <Ionicons name="book" size={24} color={isConfigured ? theme.colors.primary : '#94a3b8'} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, !isConfigured && styles.disabledText]}>{item.title}</Text>
                    {isConfigured ? (
                        <Text style={styles.subtitle}>{item.chapters.length} Bölüm</Text>
                    ) : (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>Dev Disabled / Config Missing</Text>
                        </View>
                    )}
                </View>
                {isConfigured && <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />}
            </TouchableOpacity>
        );
    };

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

    const title = selectedBook ? selectedBook.title : "Risale-i Nur Külliyatı";

    // GROUPING LOGIC
    const sections = React.useMemo(() => {
        if (selectedBook) return [];
        const books = Object.values(HTML_BOOKS);
        const grouped: Record<string, HtmlBook[]> = {};

        books.forEach(book => {
            const cat = book.category || 'Genel';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(book);
        });

        // Optional: Sort categories if needed, or rely on insertion order?
        // JS object order is usually insertion order for string keys.
        return Object.entries(grouped).map(([title, data]) => ({
            title,
            data
        }));
    }, [selectedBook]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            {selectedBook && (
                <View style={styles.infoBox}>
                    <Ionicons name="book-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.infoText}>
                        {selectedBook.title} • {selectedBook.chapters.length} Bölüm
                    </Text>
                </View>
            )}

            {selectedBook ? (
                <FlatList
                    data={selectedBook.chapters}
                    renderItem={renderChapterItem as any}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <SectionList
                    sections={sections}
                    renderItem={renderBookItem as any}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                />
            )}
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
    sectionHeader: { marginTop: 24, marginBottom: 12, paddingHorizontal: 4 },
    sectionHeaderText: { fontSize: 18, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b' },
    disabledCard: { opacity: 0.7, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
    disabledText: { color: '#94a3b8' },
    badgeContainer: { backgroundColor: '#fef2f2', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fecaca', marginTop: 2 },
    badgeText: { fontSize: 10, color: '#ef4444', fontWeight: 'bold' }
});
