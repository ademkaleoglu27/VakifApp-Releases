// LibraryHomeScreen.tsx - Premium shelf-based library interface
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    StatusBar,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ShelfRow } from '../components/ShelfRow';
import { BookCard } from '../components/BookCard';
import { PreparingModal } from '../components/PreparingModal';
import { LibrarySettingsModal } from '../components/LibrarySettingsModal';
import { SearchResultsView } from '../components/SearchResultsView';
import { LibraryCatalog, LibraryItem, Shelf } from '../catalog/LibraryCatalog';
import { initializeHtmlBooksAdapter } from '../catalog/adapters/htmlBooksAdapter';
import { getRecentReads, addRecentRead, RecentReadItem } from '../services/recentReads';

type TabKey = 'quran_evrad' | 'big' | 'small';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'quran_evrad', label: "KUR'AN\nEVRAD" },
    { key: 'big', label: 'BÜYÜK\nKİTAPLAR' },
    { key: 'small', label: 'KÜÇÜK\nKİTAPLAR' }
];

export const LibraryHomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [activeTab, setActiveTab] = useState<TabKey>('quran_evrad');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [recentReads, setRecentReads] = useState<RecentReadItem[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

    // Initialize adapters on mount
    useEffect(() => {
        initializeHtmlBooksAdapter();
    }, []);

    // Load shelves when tab changes
    useEffect(() => {
        const loadedShelves = LibraryCatalog.getShelves(activeTab);
        setShelves(loadedShelves);
    }, [activeTab]);

    // Load recent reads
    useEffect(() => {
        const loadRecentReads = async () => {
            const reads = await getRecentReads();
            setRecentReads(reads);
        };
        loadRecentReads();
    }, []);

    // Handle book press
    const handleBookPress = useCallback((item: LibraryItem) => {
        if (item.status === 'preparing' || item.status === 'disabled') {
            setSelectedItem(item);
            setModalVisible(true);
            return;
        }

        // Get actual bookId from openAction params (not the prefixed item.id)
        const actualBookId = item.openAction.params?.bookId || item.id;

        // Track recent read with correct bookId
        addRecentRead({
            id: item.id,
            bookId: actualBookId,
            title: item.title,
            cover: typeof item.cover === 'string' ? item.cover : undefined
        });

        // Close search if open
        setIsSearching(false);
        setSearchQuery('');

        // Navigate
        const { routeName, params } = item.openAction;
        navigation.navigate(routeName, params);
    }, [navigation]);

    // Handle search
    const handleSearch = useCallback(() => {
        if (searchQuery.trim()) {
            setIsSearching(true);
        }
    }, [searchQuery]);

    // Close search
    const handleCloseSearch = useCallback(() => {
        setIsSearching(false);
        setSearchQuery('');
    }, []);

    // Search results
    const searchResults = searchQuery.trim()
        ? LibraryCatalog.search(searchQuery)
        : [];

    // Convert recent reads to LibraryItems for display
    const recentItems: LibraryItem[] = recentReads.map(r => ({
        id: r.id,
        title: r.title,
        kind: 'other',
        status: 'ready',
        openAction: { type: 'route', routeName: 'RisaleHtmlReaderHome', params: { bookId: r.bookId } }
    }));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FBF8F4" />

            {/* Header with Search */}
            <View style={styles.header}>
                {/* Settings Button (was menu) */}
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setSettingsVisible(true)}
                >
                    <Ionicons name="menu" size={28} color="#1e293b" />
                </TouchableOpacity>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Kitap, Risale, Kelime"
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <View style={styles.searchButtonInner}>
                        <Ionicons name="search" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search Results Overlay */}
            {isSearching && (
                <SearchResultsView
                    results={searchResults}
                    query={searchQuery}
                    onResultPress={handleBookPress}
                    onClose={handleCloseSearch}
                />
            )}

            {/* Main Content */}
            {!isSearching && (
                <FlatList
                    data={shelves}
                    keyExtractor={(shelf) => shelf.id}
                    ListHeaderComponent={
                        <>
                            {/* Son Okunanlar */}
                            {recentItems.length > 0 && (
                                <View style={styles.recentSection}>
                                    <View style={styles.recentHeader}>
                                        <Text style={styles.recentTitle}>SON OKUNANLAR</Text>
                                        <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                                            <Ionicons name="settings-outline" size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                    </View>
                                    <FlatList
                                        data={recentItems.slice(0, 5)}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyExtractor={(item, index) => `recent-${item.id}-${index}`}
                                        contentContainerStyle={styles.recentList}
                                        renderItem={({ item, index }) => (
                                            <BookCard
                                                item={item}
                                                size={index === 0 ? 'large' : 'medium'}
                                                onPress={handleBookPress}
                                            />
                                        )}
                                    />
                                </View>
                            )}

                            {/* Category Tabs */}
                            <View style={styles.tabsContainer}>
                                {TABS.map((tab) => (
                                    <TouchableOpacity
                                        key={tab.key}
                                        style={[
                                            styles.tab,
                                            activeTab === tab.key && styles.tabActive
                                        ]}
                                        onPress={() => setActiveTab(tab.key)}
                                    >
                                        <Text style={[
                                            styles.tabLabel,
                                            activeTab === tab.key && styles.tabLabelActive
                                        ]}>
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                {/* Kitap İndir button (disabled) */}
                                <TouchableOpacity style={styles.downloadButton} disabled>
                                    <View style={styles.downloadIcon}>
                                        <Ionicons name="add" size={18} color="#94a3b8" />
                                    </View>
                                    <Text style={styles.downloadLabel}>Kitap{'\n'}İndir</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    }
                    renderItem={({ item: shelf }) => (
                        <ShelfRow shelf={shelf} onBookPress={handleBookPress} />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Preparing Modal */}
            <PreparingModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={selectedItem?.title}
            />

            {/* Settings Modal */}
            <LibrarySettingsModal
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FBF8F4' // Cream background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12
    },
    menuButton: {
        padding: 4
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 44,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1e293b'
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden'
    },
    searchButtonInner: {
        flex: 1,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    recentSection: {
        marginBottom: 16
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8
    },
    recentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        letterSpacing: 1
    },
    recentList: {
        paddingHorizontal: 16
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginBottom: 16
    },
    tab: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    tabActive: {
        borderBottomColor: '#1e293b'
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 16
    },
    tabLabelActive: {
        color: '#1e293b'
    },
    downloadButton: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: 0.5
    },
    downloadIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#94a3b8',
        justifyContent: 'center',
        alignItems: 'center'
    },
    downloadLabel: {
        fontSize: 10,
        color: '#94a3b8',
        lineHeight: 14
    },
    listContent: {
        paddingBottom: 32
    }
});
