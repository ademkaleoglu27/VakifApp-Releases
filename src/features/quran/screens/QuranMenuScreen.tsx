import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuranStore } from '../store/useQuranStore';
import METADATA from '../../quran-pdf/data/quran_metadata.json';
import * as FileSystem from 'expo-file-system';
import { QuranPackService } from '../services/QuranPackService';

const { width } = Dimensions.get('window');

type TabType = 'surah' | 'juz';

export const QuranMenuScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const initialTab = route.params?.initialTab || 'surah';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const {
        status,
        downloadProgress,
        detailedStatus,
        totalPages,
        lastPageNumber,
        installedVersion,
        installedParts,
        setError,
        setStatus,
        setDetailedStatus,
        lastError,
        failedAssetId,
        failedAt,
        retryCount
    } = useQuranStore();

    useEffect(() => {
        const checkHealth = async () => {
            // 1. Guard: If no version installed, we can't check anything.
            // It's effectively NOT_INSTALLED, so don't run health check.
            if (!installedVersion) return;

            // 2. Only verify if we think it's installed or partial.
            // If store says NOT_INSTALLED, do nothing (wait for user to download).
            if (status !== 'INSTALLED' && status !== 'PARTIAL') return;

            try {
                const activeDir = QuranPackService.getPaths(installedVersion).active;

                const dirInfo = await FileSystem.getInfoAsync(activeDir);
                if (!dirInfo.exists) {
                    // Only flag generic error if we expected it to be there
                    if (status === 'INSTALLED' || status === 'PARTIAL') {
                        console.warn("Quran pack health-check failed: active dir missing");
                        setError("Paket bulunamadı", "health-check");
                    }
                    return;
                }

                // readDirectoryAsync is fast enough for ~600 files
                const files = await FileSystem.readDirectoryAsync(activeDir);
                // Count files that look like page_XXX.webp
                const webpFiles = files.filter(f => /^page_\d{3}\.webp$/.test(f));

                // Garbage Check: if there are ANY files that are not webp pages, it's corrupt
                if (files.length !== webpFiles.length) {
                    console.warn(`Quran pack health-check failed: garbage files found (${files.length} vs ${webpFiles.length})`);
                    setError(`Bozuk dosya yapısı: ${files.length - webpFiles.length} yabancı dosya`, "health-check");
                    return;
                }

                const expected = totalPages || 604;
                if (webpFiles.length !== expected) {
                    console.warn(`Quran pack health-check failed: missing files ${webpFiles.length}/${expected}`);
                    setError(`Eksik dosya: ${webpFiles.length}/${expected}`, "health-check");
                }
            } catch (e) {
                console.warn("Quran pack health-check failed: exception", e);
                setError("Sağlık kontrolü hatası", "health-check");
            }
        };

        checkHealth();
    }, [status, installedVersion, totalPages]); // Re-run if status/version changes

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Logic
    const normalizeString = (str: string) => {
        return str
            .toLocaleLowerCase('tr-TR')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "");
    };

    const getFilteredSurahs = () => {
        if (!searchQuery) return METADATA.surahs;
        const normalizedQuery = normalizeString(searchQuery);

        return METADATA.surahs.filter(s => {
            const normalizedName = normalizeString(s.name);
            // Search in normalized name AND normalized ID (though ID is digits)
            // Or raw Search?
            return normalizedName.includes(normalizedQuery) ||
                s.id.toString().includes(searchQuery);
        });
    };

    const navigateToReader = (page: number) => {
        navigation.navigate('QuranReaderScreen', { initialPage: page });
    };

    // ... (keep handleDownload and other methods) ...

    const handleDownload = () => {
        // Immediate UI Feedback
        setStatus('DOWNLOADING');
        setDetailedStatus('İndirme başlatılıyor...');
        setError(null); // Clear previous errors

        try {
            // Start async process (fire and forget from UI perspective, store handles updates)
            QuranPackService.downloadAndInstall().catch(err => {
                console.error("Download failed to start properly:", err);
                // Store likely already set error, but just in case
            });
        } catch (e: any) {
            console.error("Sync download start failed:", e);
            setError(e.message || 'Unknown error (sync)');
        }
    };

    const renderSurahItem = ({ item }: any) => (
        <TouchableOpacity style={styles.listItem} onPress={() => navigateToReader(item.page)}>
            <View style={styles.listNum}><Text style={styles.listNumText}>{item.id}</Text></View>
            <View style={styles.listContent}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listSub}>{item.page}. Sayfa</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    const renderJuzItem = ({ item }: any) => (
        <TouchableOpacity style={styles.juzGridItem} onPress={() => navigateToReader(item.page)}>
            <View style={styles.juzBadge}>
                <Text style={styles.juzNumText}>{item.id}</Text>
            </View>
            <Text style={styles.juzLabel}>Cüz</Text>
            <Text style={styles.juzPage}>S. {item.page}</Text>
        </TouchableOpacity>
    );

    // --- GATE STATES ---

    // A. DOWNLOADING / PARTIAL
    if (status === 'DOWNLOADING' || status === 'PARTIAL') {
        const displayProgress = status === 'PARTIAL' && downloadProgress === 0 ? 0 : downloadProgress;
        const isPartial = status === 'PARTIAL';

        return (
            <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
                </View>
                <View style={styles.statusContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 20 }} />
                    <Text style={styles.statusTitle}>
                        {isPartial ? "İndirme Tamamlanmadı" : "Paket Güncelleniyor..."}
                    </Text>
                    <Text style={styles.statusSub}>%{Math.round(displayProgress * 100)}</Text>
                    <Text style={styles.statusDetail}>
                        {detailedStatus || (isPartial ? "Devam etmek için bekleyin..." : "İndiriliyor...")}
                    </Text>

                    {isPartial && (
                        <TouchableOpacity style={[styles.actionButton, { marginTop: 32 }]} onPress={handleDownload}>
                            <LinearGradient
                                colors={[theme.colors.primary, '#0d9488']}
                                style={styles.actionGradient}
                            >
                                <Text style={styles.actionButtonText}>İndirmeye Devam Et</Text>
                                <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    // B. CORRUPT
    if (status === 'CORRUPT') {
        const isDev = __DEV__;

        return (
            <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
                </View>

                <View style={styles.cardContainer}>
                    <View style={[styles.iconContainer, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="warning" size={48} color="#EF4444" />
                    </View>
                    <Text style={styles.cardTitle}>Kur'an Paketi Hatalı</Text>
                    <Text style={styles.cardSub}>
                        Paket bozulmuş veya eksik görünüyor. Okumaya devam etmek için lütfen tamir edin.
                    </Text>

                    {isDev && (
                        <View style={{ width: '100%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#EF4444', marginBottom: 4 }}>DEBUG INFO:</Text>
                            {lastError && <Text style={{ fontSize: 11, color: '#DC2626' }}>Err: {lastError}</Text>}
                            {failedAssetId && <Text style={{ fontSize: 11, color: '#64748B' }}>Asset: {failedAssetId}</Text>}
                            {failedAt && <Text style={{ fontSize: 11, color: '#94A3B8' }}>Time: {failedAt}</Text>}
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>Retry: {retryCount} | Ver: {installedVersion || 'N/A'}</Text>
                            {detailedStatus && <Text style={{ fontSize: 11, color: '#0F766E', marginTop: 4 }}>Status: {detailedStatus}</Text>}
                        </View>
                    )}

                    <TouchableOpacity style={styles.actionButton} onPress={handleDownload} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#EF4444', '#DC2626']} // Red gradient for repair
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.actionButtonText}>Tamir Et</Text>
                            <Ionicons name="build-outline" size={20} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // C. NOT_INSTALLED
    if (status === 'NOT_INSTALLED' || !installedVersion || (installedParts && installedParts.length === 0)) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
                </View>

                <View style={styles.cardContainer}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="download" size={48} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.cardTitle}>Kur'an Yüklü Değil</Text>
                    <Text style={styles.cardSub}>
                        Okumaya başlamak için Kur'an paketini indirmeniz gerekiyor.
                    </Text>

                    <TouchableOpacity style={styles.actionButton} onPress={handleDownload} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[theme.colors.primary, '#0d9488']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.actionButtonText}>Şimdi İndir</Text>
                            <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
            </View>

            {/* Devam Et (Continue Reading) Button - Only show if not searching */}
            {!searchQuery && (
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => navigateToReader(lastPageNumber)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#0f766e', '#0d9488']}
                        style={styles.continueGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.continueLeft}>
                            <View style={styles.continueIconBg}>
                                <Ionicons name="play" size={20} color="#0f766e" />
                            </View>
                            <View>
                                <Text style={styles.continueTitle}>Okumaya Devam Et</Text>
                                <Text style={styles.continueSub}>{lastPageNumber}. Sayfada Kalmıştınız</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* SEARCH BAR */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Sure ara..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'surah' && styles.activeTab]}
                    onPress={() => { setActiveTab('surah'); setSearchQuery(''); }}
                >
                    <Text style={[styles.tabText, activeTab === 'surah' && styles.activeTabText]}>Sureler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'juz' && styles.activeTab]}
                    onPress={() => { setActiveTab('juz'); setSearchQuery(''); }}
                >
                    <Text style={[styles.tabText, activeTab === 'juz' && styles.activeTabText]}>Cüzler</Text>
                </TouchableOpacity>
            </View>

            {/* Content with Scroll Bug Fix: flex: 1 ensures it fills space */}
            <View style={styles.listWrapper}>
                {activeTab === 'surah' ? (
                    <FlatList
                        key="surah-list"
                        data={getFilteredSurahs()}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderSurahItem}
                        contentContainerStyle={styles.flatListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#94A3B8' }}>Sure bulunamadı.</Text>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        key="juz-list"
                        data={METADATA.juzs}
                        numColumns={3}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderJuzItem}
                        contentContainerStyle={styles.flatListContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    centerContent: { justifyContent: 'center', alignItems: 'center' }, // For loading/error states if needed, though they have their own containers

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 16
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

    // Gate UI Styles
    statusContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        marginTop: -60 // compensate for header
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8
    },
    statusSub: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.primary,
        marginBottom: 8
    },
    statusDetail: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center'
    },

    cardContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        marginTop: -60
    },
    iconContainer: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#F0FDFA',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#CCFBF1'
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center'
    },
    cardSub: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22
    },
    actionButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    actionGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF'
    },

    // Hub Styles
    continueButton: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#0f766e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    continueGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    continueLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    continueIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    continueTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF'
    },
    continueSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2
    },

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9'
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 3,
        borderColor: 'transparent'
    },
    activeTab: { borderColor: theme.colors.primary },
    tabText: { fontSize: 16, fontWeight: '600', color: '#94A3B8' },
    activeTabText: { color: theme.colors.primary },

    listWrapper: { flex: 1 },
    flatListContent: { padding: 20, paddingBottom: 40 },

    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: '#F8FAFC'
    },
    listNum: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
        marginRight: 16
    },
    listNumText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
    listContent: { flex: 1 },
    listName: { fontSize: 16, fontWeight: '600', color: '#334155' },
    listSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

    juzGridItem: {
        width: (width - 60) / 3,
        aspectRatio: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        margin: 3.33,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    juzBadge: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8
    },
    juzNumText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    juzLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    juzPage: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

    // Search Styles
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        marginHorizontal: 20,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 24,
    },
    searchIcon: {
        marginRight: 12
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        height: '100%'
    }
});
