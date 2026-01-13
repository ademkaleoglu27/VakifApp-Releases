import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Platform,
    StatusBar,
    ScrollView // Should replace FlatList for nested scroll or stick with FlatList inside
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RISALE_BOOKS, RisaleBook, getRisaleLocalPath } from '@/config/risaleSources';
import { RisaleDownloadService } from '@/services/risaleDownloadService';
import { theme } from '@/config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RisaleHomeScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [readyBooks, setReadyBooks] = useState<Record<string, boolean>>({});

    const checkBooks = useCallback(async () => {
        const status: Record<string, boolean> = {};
        for (const book of RISALE_BOOKS) {
            status[book.id] = await RisaleDownloadService.isBookReady(book.fileName);
        }
        setReadyBooks(status);
    }, []);

    useEffect(() => {
        checkBooks();
        const unsubscribe = navigation.addListener('focus', checkBooks);
        return unsubscribe;
    }, [navigation, checkBooks]);

    const handleOpen = async (book: RisaleBook) => {
        // Special case for Sözler to use VP Reader
        if (book.id === 'sozler') {
            navigation.navigate('RisaleVirtualPageSectionList', {
                bookId: 'risale.sozler@diyanet.tr',
                version: '1.0.0',
                workId: 'sozler', // Legacy Bridge
                workTitle: 'Sözler'
            });
        } else {
            // ... existing alert code
            Alert.alert(
                "Yakında",
                "Bu kitap henüz yeni altyapıya taşınmadı. Şu an sadece Sözler açık.",
                [{ text: "Tamam" }]
            );
        }
    };



    const renderItem = ({ item }: { item: RisaleBook }) => {
        // PDF Status check removed - hard redirect in handleOpen
        return (
            <TouchableOpacity
                style={styles.bookCard}
                onPress={() => handleOpen(item)}
            >
                <View style={styles.bookIconContainer}>
                    <Ionicons name="book" size={20} color="#999" />
                </View>
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookStatus}>Tap key to open</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Premium Header Background */}
            <View style={styles.headerBackground}>
                <LinearGradient
                    colors={[theme.colors.primary, '#0f766e']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.decorativeCircle} />
            </View>

            <View style={[styles.content, { paddingTop: insets.top + 10, paddingBottom: 0 }]}>
                {/* Header Section */}
                <View style={styles.header}>


                    <View style={styles.headerTopContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="library" size={48} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.title}>Risale-i Nur</Text>
                            <Text style={styles.subtitle}>Külliyat (Çevrimdışı)</Text>
                        </View>
                    </View>
                </View>

                {/* Main Content Card */}
                <View style={styles.cardContent}>
                    <View style={styles.quoteContainer}>
                        <Text style={styles.quoteText}>
                            "İman hem nurdur, hem kuvvettir. Hakiki imanı elde eden adam, kâinata meydan okuyabilir."
                        </Text>
                        <Text style={styles.quoteSource}>- Bediüzzaman Said Nursi</Text>
                    </View>



                    <FlatList
                        data={RISALE_BOOKS}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBackground: {
        height: '45%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        backgroundColor: theme.colors.primary,
    },
    decorativeCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.5 }],
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    header: {
        paddingHorizontal: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        marginBottom: 20,
    },
    headerTopContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    cardContent: {
        flex: 1,
        marginTop: 30,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    quoteContainer: {
        marginBottom: 24,
    },
    quoteText: {
        color: '#334155',
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
        fontWeight: '500'
    },
    quoteSource: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    resumeButton: {
        width: '100%',
        height: 72,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        marginBottom: 20,
    },
    resumeGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    resumeContent: {
        flex: 1,
    },
    resumeTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    resumeSubtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    resumeSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '500'
    },
    bookCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bookIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconReady: {
        backgroundColor: theme.colors.primary,
    },
    iconMissing: {
        backgroundColor: '#cbd5e1',
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    bookStatus: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
        flex: 1,
    }
});
