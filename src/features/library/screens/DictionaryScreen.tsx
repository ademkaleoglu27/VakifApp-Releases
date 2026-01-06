import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    LayoutAnimation,
    UIManager,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { dictionaryDb, DictionaryEntry } from '@/services/dictionaryDb';
import { theme } from '@/config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import debounce from 'lodash/debounce';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const DictionaryScreen = () => {
    const insets = useSafeAreaInsets();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DictionaryEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initialize DB
    useEffect(() => {
        dictionaryDb.init().catch(err => console.error('DB Init Error', err));
    }, []);

    // Debounce wrapper
    const searchDebounced = useMemo(
        () =>
            debounce(async (text: string) => {
                if (text.length < 2) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSearchResults([]);
                    setLoading(false);
                    return;
                }
                try {
                    const results = await dictionaryDb.search(text);
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSearchResults(results);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }, 300),
        []
    );

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        setLoading(true);
        searchDebounced(text);
    };

    const handleSelectWord = (word: DictionaryEntry) => {
        setSelectedEntry(word);
        setModalVisible(true);
    };

    const renderItem = ({ item }: { item: DictionaryEntry }) => (
        <TouchableOpacity
            style={styles.resultItem}
            onPress={() => handleSelectWord(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContentItem}>
                <Text style={styles.wordOsm}>{item.word_osm}</Text>
                <View style={styles.trContainer}>
                    <Text style={styles.trLabel}>Okunuşu:</Text>
                    <Text style={styles.wordTr}>{item.word_tr}</Text>
                </View>
                <Text style={styles.clickHint}>Manası için tıklayınız</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );

    const navigation = useNavigation();

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
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerTopContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="library" size={40} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.title}>Osmanlıca Lügat</Text>
                            <Text style={styles.subtitle}>Risale-i Nur Külliyatı</Text>
                        </View>
                    </View>
                </View>

                {/* Main Content Card */}
                <View style={styles.cardContent}>
                    {/* Search Section */}
                    <View style={styles.searchSection}>
                        <Text style={styles.searchLabel}>"Kelimeler, manaların zarfıdır."</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Kelime ara (Örn: Meşveret)"
                                placeholderTextColor="#94a3b8"
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoCapitalize="none"
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => handleSearch('')}>
                                    <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                                </TouchableOpacity>
                            )}
                        </View>
                        {loading && (
                            <ActivityIndicator style={styles.loader} color="#d4af37" />
                        )}
                    </View>

                    <FlatList
                        data={searchResults}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            !loading && searchQuery.length > 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
                                    <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                                </View>
                            ) : (
                                !loading && searchQuery.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="book-outline" size={64} color="#e2e8f0" />
                                        <Text style={[styles.emptyText, { fontSize: 14, maxWidth: 200, textAlign: 'center', marginTop: 12 }]}>
                                            Aramak istediğiniz kelimeyi yukarıya yazınız.
                                        </Text>
                                    </View>
                                ) : null
                            )
                        }
                    />
                </View>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                {/* Blur Effect Simulation using simple View with opacity */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />

                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedEntry?.word_osm}</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>{selectedEntry?.word_tr}</Text>

                        {/* Definition from Local DB */}
                        <View style={styles.definitionContainer}>
                            <ScrollView style={styles.definitionTextContainer} persistentScrollbar={true}>
                                {selectedEntry?.definition ? (
                                    <View>
                                        <Text style={styles.definitionTitle}>Kelime Anlamı:</Text>
                                        <Text style={styles.definitionText}>{selectedEntry.definition}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.noDefinitionText}>Tanım bulunamadı.</Text>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBackground: {
        height: '40%', // Slightly shorter for search focus
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
        width: 72,
        height: 72,
        borderRadius: 18,
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
        paddingHorizontal: 20,
        paddingTop: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    searchSection: {
        marginBottom: 20,
    },
    searchLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 12,
        textAlign: 'center',
        fontStyle: 'italic'
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1e293b',
        height: '100%',
    },
    loader: {
        position: 'absolute',
        right: 40,
        top: 18,
    },
    resultItem: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    cardContentItem: {
        flex: 1,
    },
    wordOsm: {
        fontSize: 24,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginBottom: 4,
    },
    trContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    trLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    wordTr: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '600',
    },
    clickHint: {
        fontSize: 10,
        color: theme.colors.secondary || '#d4af37',
        marginTop: 4,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        width: '100%',
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
        elevation: 24,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
        flexShrink: 0,
    },
    modalTitle: {
        fontSize: 28,
        color: theme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSubtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
        flexShrink: 0,
    },
    definitionContainer: {
        flexShrink: 1,
    },
    definitionTextContainer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    definitionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginTop: 12,
        marginBottom: 8,
        letterSpacing: 1,
    },
    definitionText: {
        fontSize: 17,
        color: '#1e293b',
        lineHeight: 28,
        textAlign: 'left',
    },
    noDefinitionText: {
        fontSize: 15,
        color: '#94a3b8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
});
