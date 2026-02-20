import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, Dimensions, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/config/theme';
import { QuranTextService, SurahSummary } from '../services/QuranTextService';
import { useQuranTextStore } from '../store/useQuranTextStore';
import { useQuranStore } from '@/features/quran/store/useQuranStore';
import METADATA from '../../quran-pdf/data/quran_metadata.json';

const { width } = Dimensions.get('window');

type TabType = 'surah' | 'juz';

// Juz page ranges (Standard Medina Mushaf)
const JUZ_RANGES: { juz: number; startSurah: string; endSurah: string }[] = [
    { juz: 1, startSurah: 'Fâtiha', endSurah: 'Bakara 141' },
    { juz: 2, startSurah: 'Bakara 142', endSurah: 'Bakara 252' },
    { juz: 3, startSurah: 'Bakara 253', endSurah: 'Âl-i İmrân 92' },
    { juz: 4, startSurah: 'Âl-i İmrân 93', endSurah: 'Nisâ 23' },
    { juz: 5, startSurah: 'Nisâ 24', endSurah: 'Nisâ 147' },
    { juz: 6, startSurah: 'Nisâ 148', endSurah: 'Mâide 81' },
    { juz: 7, startSurah: 'Mâide 82', endSurah: 'En\'âm 110' },
    { juz: 8, startSurah: 'En\'âm 111', endSurah: 'A\'râf 87' },
    { juz: 9, startSurah: 'A\'râf 88', endSurah: 'Enfâl 40' },
    { juz: 10, startSurah: 'Enfâl 41', endSurah: 'Tevbe 92' },
    { juz: 11, startSurah: 'Tevbe 93', endSurah: 'Hûd 5' },
    { juz: 12, startSurah: 'Hûd 6', endSurah: 'Yûsuf 52' },
    { juz: 13, startSurah: 'Yûsuf 53', endSurah: 'İbrâhîm 52' },
    { juz: 14, startSurah: 'Hicr 1', endSurah: 'Nahl 128' },
    { juz: 15, startSurah: 'İsrâ 1', endSurah: 'Kehf 74' },
    { juz: 16, startSurah: 'Kehf 75', endSurah: 'Tâhâ 135' },
    { juz: 17, startSurah: 'Enbiyâ 1', endSurah: 'Hacc 78' },
    { juz: 18, startSurah: 'Mü\'minûn 1', endSurah: 'Furkân 20' },
    { juz: 19, startSurah: 'Furkân 21', endSurah: 'Neml 55' },
    { juz: 20, startSurah: 'Neml 56', endSurah: 'Ankebût 45' },
    { juz: 21, startSurah: 'Ankebût 46', endSurah: 'Ahzâb 30' },
    { juz: 22, startSurah: 'Ahzâb 31', endSurah: 'Yâsîn 27' },
    { juz: 23, startSurah: 'Yâsîn 28', endSurah: 'Zümer 31' },
    { juz: 24, startSurah: 'Zümer 32', endSurah: 'Fussilet 46' },
    { juz: 25, startSurah: 'Fussilet 47', endSurah: 'Câsiye 37' },
    { juz: 26, startSurah: 'Ahkaf 1', endSurah: 'Zâriyât 30' },
    { juz: 27, startSurah: 'Zâriyât 31', endSurah: 'Hadîd 29' },
    { juz: 28, startSurah: 'Mücâdele 1', endSurah: 'Tahrîm 12' },
    { juz: 29, startSurah: 'Mülk 1', endSurah: 'Mürselât 50' },
    { juz: 30, startSurah: 'Nebe\' 1', endSurah: 'Nâs 6' },
];

export const QuranTextMenuScreen = () => {
    const navigation = useNavigation<any>();
    const { lastSurahId, readingMode, setReadingMode } = useQuranTextStore();
    const quranPackStatus = useQuranStore(s => s.status);
    const downloadProgress = useQuranStore(s => s.downloadProgress);
    const [surahs, setSurahs] = useState<SurahSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('surah');

    const isImageMode = readingMode === 'image';
    const packReady = quranPackStatus === 'INSTALLED';
    const isDownloading = quranPackStatus === 'DOWNLOADING' || quranPackStatus === 'PARTIAL';

    useEffect(() => {
        loadSurahs();
    }, []);

    const loadSurahs = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await QuranTextService.getSurahs();
            setSurahs(data);
        } catch (e: any) {
            setError(e.message || 'Sureler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const normalize = (s: string) =>
        s.toLocaleLowerCase('tr-TR')
            .replace(/[âāà]/g, 'a')
            .replace(/[îīì]/g, 'i')
            .replace(/[ûūù]/g, 'u')
            .replace(/[êēè]/g, 'e')
            .replace(/[''ʿ]/g, '');

    const filteredSurahs = useMemo(() => {
        if (!searchQuery.trim()) return surahs;
        const q = normalize(searchQuery.trim());
        return surahs.filter(s =>
            normalize(s.name).includes(q) ||
            normalize(s.name_en).includes(q) ||
            s.id.toString() === q
        );
    }, [surahs, searchQuery]);

    // ── Surah → Page number lookup ──────────────────────────
    const getPageForSurah = (surahId: number): number => {
        const match = METADATA.surahs.find((s: any) => s.id === surahId);
        return match?.page || 1;
    };

    // ── Juz → Page number lookup ────────────────────────────
    const getPageForJuz = (juzId: number): number => {
        const match = METADATA.juzs.find((j: any) => j.id === juzId);
        return match?.page || 1;
    };

    const navigateToReader = (surahId: number, startVerse?: number) => {
        if (isImageMode) {
            const page = getPageForSurah(surahId);
            navigation.navigate('QuranReaderScreen', { initialPage: page });
        } else {
            navigation.navigate('QuranTextReaderScreen', { surahId, startVerse: startVerse || 1 });
        }
    };

    const navigateToJuzImage = (juzId: number) => {
        const page = getPageForJuz(juzId);
        navigation.navigate('QuranReaderScreen', { initialPage: page });
    };

    // ── Render Surah Item ──────────────────────────────────
    const renderSurahItem = ({ item }: { item: SurahSummary }) => {
        const isLastRead = item.id === lastSurahId;

        return (
            <TouchableOpacity
                style={[styles.surahItem, isLastRead && styles.surahItemHighlight]}
                onPress={() => navigateToReader(item.id)}
                activeOpacity={0.7}
            >
                {/* Number Badge */}
                <View style={[styles.numberBadge, isLastRead && styles.numberBadgeActive]}>
                    <Text style={[styles.numberText, isLastRead && styles.numberTextActive]}>
                        {item.id}
                    </Text>
                </View>

                {/* Surah Info */}
                <View style={styles.surahInfo}>
                    <Text style={styles.surahNameTr}>{item.name}</Text>
                    <Text style={styles.surahMeta}>
                        {item.verse_count} ayet
                    </Text>
                </View>

                {/* Arabic Name */}
                <Text style={styles.surahNameAr}>{item.name_original}</Text>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        );
    };

    // ── Render Juz Item ────────────────────────────────────
    const renderJuzItem = ({ item }: { item: typeof JUZ_RANGES[0] }) => (
        <TouchableOpacity
            style={styles.juzItem}
            onPress={() => {
                if (isImageMode) {
                    navigateToJuzImage(item.juz);
                } else {
                    // Juz → { surahId, verseNumber } mapping (Medina Mushaf)
                    const juzStartMap: Record<number, { s: number; v: number }> = {
                        1: { s: 1, v: 1 }, 2: { s: 2, v: 142 }, 3: { s: 2, v: 253 },
                        4: { s: 3, v: 93 }, 5: { s: 4, v: 24 }, 6: { s: 4, v: 148 },
                        7: { s: 5, v: 82 }, 8: { s: 6, v: 111 }, 9: { s: 7, v: 88 },
                        10: { s: 8, v: 41 }, 11: { s: 9, v: 93 }, 12: { s: 11, v: 6 },
                        13: { s: 12, v: 53 }, 14: { s: 15, v: 1 }, 15: { s: 17, v: 1 },
                        16: { s: 18, v: 75 }, 17: { s: 21, v: 1 }, 18: { s: 23, v: 1 },
                        19: { s: 25, v: 21 }, 20: { s: 27, v: 56 }, 21: { s: 29, v: 46 },
                        22: { s: 33, v: 31 }, 23: { s: 36, v: 28 }, 24: { s: 39, v: 32 },
                        25: { s: 41, v: 47 }, 26: { s: 46, v: 1 }, 27: { s: 51, v: 31 },
                        28: { s: 58, v: 1 }, 29: { s: 67, v: 1 }, 30: { s: 78, v: 1 },
                    };
                    const start = juzStartMap[item.juz] || { s: 1, v: 1 };
                    navigateToReader(start.s, start.v);
                }
            }}
            activeOpacity={0.7}
        >
            <View style={styles.juzBadge}>
                <Text style={styles.juzBadgeText}>{item.juz}</Text>
            </View>
            <View style={styles.juzInfo}>
                <Text style={styles.juzTitle}>{item.juz}. Cüz</Text>
                <Text style={styles.juzRange}>{item.startSurah} → {item.endSurah}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </TouchableOpacity>
    );

    // ── Main Render ────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Premium Header */}
            <LinearGradient
                colors={[theme.colors.primary, '#0f766e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Kur'an-ı Kerim</Text>
                        <Text style={styles.headerSubtitle}>
                            {isImageMode ? 'Hat Mushaf (Resim)' : 'Meal & Transliterasyon'}
                        </Text>
                    </View>
                    {/* ── Mod Geçiş Butonu ── */}
                    <TouchableOpacity
                        onPress={() => setReadingMode(isImageMode ? 'text' : 'image')}
                        style={styles.modeToggleBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isImageMode ? 'document-text-outline' : 'image-outline'}
                            size={20}
                            color="white"
                        />
                        <Text style={styles.modeToggleText}>
                            {isImageMode ? 'Metin' : 'Resim'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Sure ara..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'surah' && styles.tabActive]}
                    onPress={() => setActiveTab('surah')}
                >
                    <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>
                        Sureler
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'juz' && styles.tabActive]}
                    onPress={() => setActiveTab('juz')}
                >
                    <Text style={[styles.tabText, activeTab === 'juz' && styles.tabTextActive]}>
                        Cüzler
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Image Mode Status Banner */}
            {isImageMode && !packReady && (
                <View style={styles.packBanner}>
                    <Ionicons
                        name={isDownloading ? 'cloud-download-outline' : 'information-circle-outline'}
                        size={18}
                        color={isDownloading ? '#2563eb' : '#b45309'}
                    />
                    <Text style={styles.packBannerText}>
                        {isDownloading
                            ? `Hat Mushaf indiriliyor... %${Math.round(downloadProgress * 100)}`
                            : 'Hat Mushaf paketi henüz indirilmedi. Bir sureye dokunun.'}
                    </Text>
                </View>
            )}
            {isImageMode && packReady && (
                <View style={[styles.packBanner, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                    <Text style={[styles.packBannerText, { color: '#15803d' }]}>Hat Mushaf hazır</Text>
                </View>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Sureler yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadSurahs}>
                        <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            ) : activeTab === 'surah' ? (
                <FlatList
                    data={filteredSurahs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderSurahItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={20}
                />
            ) : (
                <FlatList
                    data={JUZ_RANGES}
                    keyExtractor={item => item.juz.toString()}
                    renderItem={renderJuzItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAF9',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    modeToggleText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'white',
    },
    packBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFBEB',
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A',
    },
    packBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#92400E',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: 'white',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#94a3b8',
    },
    tabTextActive: {
        color: theme.colors.primary,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
    },
    // ── Surah Item ──
    surahItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    surahItemHighlight: {
        borderWidth: 1.5,
        borderColor: theme.colors.accent,
        backgroundColor: '#ECFDF5',
    },
    numberBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    numberBadgeActive: {
        backgroundColor: theme.colors.primary,
    },
    numberText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    numberTextActive: {
        color: 'white',
    },
    surahInfo: {
        flex: 1,
    },
    surahNameTr: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    surahMeta: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    surahNameAr: {
        fontSize: 18,
        color: theme.colors.primary,
        fontWeight: '600',
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    // ── Juz Item ──
    juzItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    juzBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.secondaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    juzBadgeText: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    juzInfo: {
        flex: 1,
    },
    juzTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    juzRange: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    // ── States ──
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    errorText: {
        marginTop: 12,
        fontSize: 14,
        color: '#ef4444',
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
    },
    retryBtnText: {
        color: 'white',
        fontWeight: '600',
    },
});
