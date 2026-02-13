import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, Platform, Switch, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { theme } from '@/config/theme';
import { QuranTextService, SurahDetail, Verse, RECITERS } from '../services/QuranTextService';
import { useQuranTextStore } from '../store/useQuranTextStore';
import { useAudio } from '@/context/AudioContext';

const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ';

// Font options (all already loaded in App.tsx)
const FONT_OPTIONS = [
    { key: 'ScheherazadeNew', label: 'Scheherazade' },
    { key: 'KFGQPC_HAFS', label: 'Mushaf' },
    { key: 'Amiri', label: 'Amiri' },
];

// Color presets
const COLOR_OPTIONS = [
    { key: '#1A237E', label: 'Mavi' },
    { key: '#1B1B1B', label: 'Siyah' },
    { key: '#1B5E20', label: 'Yeşil' },
    { key: '#B71C1C', label: 'Kırmızı' },
    { key: '#4A148C', label: 'Mor' },
];

// Unicode verse number markers ﴿١﴾
const ARABIC_NUMS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNum = (n: number): string =>
    n.toString().split('').map(d => ARABIC_NUMS[parseInt(d)]).join('');

export const QuranTextReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { surahId, startVerse } = route.params || { surahId: 1, startVerse: 1 };

    const {
        selectedAuthorId,
        selectedReciterId,
        showTransliteration,
        showTranslation,
        fontSize,
        arabicFont,
        arabicColor,
        setLastPosition,
        setShowTransliteration,
        setShowTranslation,
        setSelectedReciterId,
        setArabicFont,
        setArabicColor,
    } = useQuranTextStore();

    const [surah, setSurah] = useState<SurahDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const { playTrack, currentTrack, isPlaying, togglePlayPause, isLoading: audioLoading } = useAudio();

    // ── Audio Playback ──────────────────────────────────────
    const handlePlaySurah = async () => {
        const trackId = `quran-surah-${surahId}-r${selectedReciterId}`;

        // If same surah+reciter is already playing, toggle play/pause
        if (currentTrack?.id === trackId) {
            await togglePlayPause();
            return;
        }

        // Türkçe Meal (id: 0) → use acikkuran.com audio directly
        if (selectedReciterId === 0) {
            if (surah?.audio?.mp3) {
                await playTrack({
                    id: trackId,
                    title: `${surah.name} Suresi • Türkçe Meal`,
                    source: { uri: surah.audio.mp3 },
                });
            } else {
                Alert.alert('Hata', 'Türkçe meal sesi bulunamadı.');
            }
            return;
        }

        // Arabic reciters → quran.com API
        const audioUrl = await QuranTextService.getReciterAudioUrl(selectedReciterId, surahId);
        if (!audioUrl) {
            Alert.alert('Hata', 'Ses dosyası bulunamadı.');
            return;
        }

        const reciter = RECITERS.find(r => r.id === selectedReciterId);
        const reciterLabel = reciter ? `${reciter.name}${reciter.style ? ` (${reciter.style})` : ''}` : '';

        await playTrack({
            id: trackId,
            title: `${surah?.name || ''} Suresi • ${reciterLabel}`,
            source: { uri: audioUrl },
        });
    };

    const isCurrentSurahPlaying = currentTrack?.id === `quran-surah-${surahId}-r${selectedReciterId}` && isPlaying;

    // ── Pinch-to-Zoom (store-based fontSize) ────────────────
    const baseScale = useSharedValue(1);
    const [isPinching, setIsPinching] = useState(false);
    const updateFontSize = useCallback((newSize: number) => {
        useQuranTextStore.getState().setFontSize(newSize);
    }, []);

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            baseScale.value = fontSize;
            runOnJS(setIsPinching)(true);
        })
        .onEnd((e) => {
            runOnJS(setIsPinching)(false);
            // Step by ±0.1 (same as A+/A- buttons) based on pinch direction
            const step = e.scale > 1.05 ? 0.1 : e.scale < 0.95 ? -0.1 : 0;
            if (step === 0) return; // Ignore tiny/accidental pinches
            const newSize = Math.max(0.7, Math.min(1.8, baseScale.value + step));
            const rounded = Math.round(newSize * 10) / 10;
            runOnJS(updateFontSize)(rounded);
        })
        .onFinalize(() => {
            runOnJS(setIsPinching)(false);
        });

    // ── Load Surah ─────────────────────────────────────────
    useEffect(() => {
        loadSurah();
    }, [surahId, selectedAuthorId]);

    const loadSurah = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await QuranTextService.getSurah(surahId, selectedAuthorId);
            setSurah(data);
            setLastPosition(surahId, startVerse || 1);

            // Scroll to startVerse if specified (e.g. from Juz navigation)
            if (startVerse && startVerse > 1 && data.verses?.length) {
                const verseIndex = data.verses.findIndex((v: Verse) => v.verse_number >= startVerse);
                if (verseIndex > 0) {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({
                            index: verseIndex,
                            animated: true,
                            viewOffset: 20,
                        });
                    }, 300);
                }
            }
        } catch (e: any) {
            setError(e.message || 'Sure yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    // ── Navigate to Adjacent Surah ─────────────────────────
    const goToSurah = useCallback((id: number) => {
        if (id < 1 || id > 114) return;
        navigation.replace('QuranTextReaderScreen', { surahId: id });
    }, [navigation]);

    // ── Render Verse (Hybrid Flow) ─────────────────────────
    const renderVerse = useCallback(({ item }: { item: Verse }) => {
        const arabicFontSize = 28 * fontSize;
        const translationFontSize = 15 * fontSize;
        const translitFontSize = 13 * fontSize;

        return (
            <View style={styles.verseRow}>
                {/* Arabic Text with inline verse number */}
                <View style={styles.arabicLine}>
                    <Text
                        style={[styles.arabicText, { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2.0, fontFamily: arabicFont, color: arabicColor }]}
                        selectable
                    >
                        {item.verse}
                        {' '}
                        <Text style={[styles.verseNumInline, { fontSize: arabicFontSize * 0.55, fontFamily: arabicFont }]}>
                            ﴿{toArabicNum(item.verse_number)}﴾
                        </Text>
                    </Text>
                </View>

                {/* Transliteration (optional) */}
                {showTransliteration && (
                    <Text
                        style={[styles.transliterationText, { fontSize: translitFontSize }]}
                        selectable
                    >
                        {item.transcription}
                    </Text>
                )}

                {/* Meal / Translation (optional) */}
                {showTranslation && (
                    <View style={styles.translationRow}>
                        <Text style={styles.mealVerseNum}>{item.verse_number}.</Text>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={[styles.translationText, { fontSize: translationFontSize }]}
                                selectable
                            >
                                {item.translation?.text || ''}
                            </Text>
                            {item.translation?.footnotes && item.translation.footnotes.length > 0 && (
                                <View style={styles.footnotesContainer}>
                                    {item.translation.footnotes.map((fn) => (
                                        <Text key={fn.id} style={styles.footnoteText}>
                                            [{fn.number}] {fn.text}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    }, [fontSize, showTransliteration, showTranslation]);

    // ── Surah Header Component ─────────────────────────────
    const SurahHeader = () => {
        if (!surah) return null;

        return (
            <View style={styles.surahHeader}>
                {/* Surah Title Card */}
                <LinearGradient
                    colors={['#FFF9E6', '#FFF3CC']}
                    style={styles.surahTitleCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.surahArabicTitle}>{surah.name_original}</Text>
                    <Text style={styles.surahTrTitle}>
                        ({surah.id}) {surah.name} Suresi
                    </Text>
                    <Text style={styles.surahMeta}>
                        {surah.verse_count} Ayet • {surah.name_translation_tr || surah.name_en}
                    </Text>
                </LinearGradient>

                {/* Bismillah (skip for Tevbe = surah 9) */}
                {surahId !== 9 && (
                    <View style={styles.bismillahContainer}>
                        <Text style={styles.bismillahText}>{BISMILLAH}</Text>
                    </View>
                )}
            </View>
        );
    };

    // ── Footer Navigation ──────────────────────────────────
    const SurahFooter = () => (
        <View style={styles.footerNav}>
            {surahId > 1 && (
                <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() => goToSurah(surahId - 1)}
                >
                    <Ionicons name="chevron-back" size={18} color="#8B4513" />
                    <Text style={styles.navBtnText}>Önceki Sure</Text>
                </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {surahId < 114 && (
                <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() => goToSurah(surahId + 1)}
                >
                    <Text style={styles.navBtnText}>Sonraki Sure</Text>
                    <Ionicons name="chevron-forward" size={18} color="#8B4513" />
                </TouchableOpacity>
            )}
        </View>
    );

    // ── Settings Panel ─────────────────────────────────────
    const SettingsPanel = () => (
        <View style={styles.settingsPanel}>
            {/* Transliteration Toggle */}
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Transliterasyon</Text>
                <Switch
                    value={showTransliteration}
                    onValueChange={setShowTransliteration}
                    trackColor={{ false: '#e2e8f0', true: '#8B4513' }}
                    thumbColor="white"
                />
            </View>
            {/* Translation/Meal Toggle */}
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Meal Göster</Text>
                <Switch
                    value={showTranslation}
                    onValueChange={setShowTranslation}
                    trackColor={{ false: '#e2e8f0', true: '#8B4513' }}
                    thumbColor="white"
                />
            </View>
            {/* Font Size */}
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Yazı Boyutu</Text>
                <View style={styles.fontSizeControls}>
                    <TouchableOpacity
                        style={styles.fontSizeBtn}
                        onPress={() => useQuranTextStore.getState().setFontSize(Math.max(0.7, fontSize - 0.1))}
                    >
                        <Text style={styles.fontSizeBtnText}>A-</Text>
                    </TouchableOpacity>
                    <Text style={styles.fontSizeValue}>{Math.round(fontSize * 100)}%</Text>
                    <TouchableOpacity
                        style={styles.fontSizeBtn}
                        onPress={() => useQuranTextStore.getState().setFontSize(Math.min(1.8, fontSize + 0.1))}
                    >
                        <Text style={styles.fontSizeBtnText}>A+</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* Arabic Font Picker */}
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Arapça Font</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reciterScroll}>
                {FONT_OPTIONS.map(f => {
                    const isSelected = f.key === arabicFont;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.reciterChip, isSelected && styles.reciterChipActive]}
                            onPress={() => setArabicFont(f.key)}
                        >
                            <Text style={[styles.reciterChipText, isSelected && styles.reciterChipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            {/* Arabic Color Picker */}
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Arapça Renk</Text>
                <View style={styles.colorRow}>
                    {COLOR_OPTIONS.map(c => (
                        <TouchableOpacity
                            key={c.key}
                            onPress={() => setArabicColor(c.key)}
                            style={[
                                styles.colorCircle,
                                { backgroundColor: c.key },
                                c.key === arabicColor && styles.colorCircleActive,
                            ]}
                        />
                    ))}
                </View>
            </View>
            {/* Reciter (Hafız) Picker */}
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Hafız</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reciterScroll}>
                {RECITERS.map(r => {
                    const isSelected = r.id === selectedReciterId;
                    return (
                        <TouchableOpacity
                            key={r.id}
                            style={[styles.reciterChip, isSelected && styles.reciterChipActive]}
                            onPress={() => setSelectedReciterId(r.id)}
                        >
                            <Text style={[styles.reciterChipText, isSelected && styles.reciterChipTextActive]}>
                                {r.name}{r.style ? ` (${r.style})` : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    // ── Main Render ────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.topBarBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={22} color="#5D4037" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.topBarTitle}
                    onPress={() => navigation.navigate('QuranTextMenuScreen')}
                >
                    <Text style={styles.topBarTitleText} numberOfLines={1}>
                        {surah ? `${surah.name} Suresi` : 'Yükleniyor...'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#8B7355" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowSettings(!showSettings)}
                    style={styles.topBarBtn}
                >
                    <Ionicons
                        name={showSettings ? 'settings' : 'settings-outline'}
                        size={22}
                        color="#5D4037"
                    />
                </TouchableOpacity>

                {/* Audio Play Button */}
                {surah?.audio?.mp3 && (
                    <TouchableOpacity
                        onPress={handlePlaySurah}
                        style={[styles.topBarBtn, isCurrentSurahPlaying && styles.topBarBtnActive]}
                        disabled={audioLoading}
                    >
                        {audioLoading && currentTrack?.id === `quran-surah-${surahId}` ? (
                            <ActivityIndicator size="small" color="#8B4513" />
                        ) : (
                            <Ionicons
                                name={isCurrentSurahPlaying ? 'pause' : 'play'}
                                size={22}
                                color={isCurrentSurahPlaying ? '#fff' : '#5D4037'}
                            />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Settings */}
            {showSettings && <SettingsPanel />}

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#8B4513" />
                    <Text style={styles.loadingText}>Sure yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadSurah}>
                        <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <GestureDetector gesture={pinchGesture}>
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={surah?.verses || []}
                            keyExtractor={item => `${item.surah_id}-${item.verse_number}`}
                            renderItem={renderVerse}
                            ListHeaderComponent={<SurahHeader />}
                            ListFooterComponent={<SurahFooter />}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={!isPinching}
                            initialNumToRender={Math.max(15, (startVerse || 1) + 5)}
                            maxToRenderPerBatch={10}
                            windowSize={7}
                            removeClippedSubviews={Platform.OS === 'android'}
                            onScrollToIndexFailed={(info) => {
                                setTimeout(() => {
                                    flatListRef.current?.scrollToIndex({
                                        index: info.index,
                                        animated: true,
                                        viewOffset: 20,
                                    });
                                }, 500);
                            }}
                        />
                    </View>
                </GestureDetector>
            )}
        </SafeAreaView>
    );
};

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E7', // Warm parchment / cream
    },
    // ── Top Bar ──
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFF3CC',
        borderBottomWidth: 1,
        borderBottomColor: '#E8D5A3',
    },
    topBarBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(139,69,19,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBarBtnActive: {
        backgroundColor: '#8B4513',
    },
    topBarTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    topBarTitleText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#5D4037',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    // ── Settings ──
    settingsPanel: {
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E8D5A3',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4037',
    },
    fontSizeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    fontSizeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(139,69,19,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fontSizeBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B4513',
    },
    fontSizeValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8B7355',
        minWidth: 36,
        textAlign: 'center',
    },
    // ── Surah Header ──
    surahHeader: {
        marginBottom: 8,
    },
    surahTitleCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E8D5A3',
    },
    surahArabicTitle: {
        fontSize: 34,
        color: '#1A237E', // Deep blue matching reference
        fontFamily: 'ScheherazadeNew',
        marginBottom: 8,
    },
    surahTrTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5D4037',
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    surahMeta: {
        fontSize: 13,
        color: '#8B7355',
    },
    bismillahContainer: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 4,
    },
    bismillahText: {
        fontSize: 30,
        color: '#B71C1C', // Deep red for Bismillah
        fontFamily: 'ScheherazadeNew',
    },
    // ── Verse Row (Hybrid Flow - no card borders) ──
    verseRow: {
        paddingVertical: 4,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(139,69,19,0.08)',
    },
    arabicLine: {
        paddingVertical: 6,
        paddingHorizontal: 2,
    },
    arabicText: {
        fontSize: 28,
        lineHeight: 56,
        color: '#1A237E', // Deep blue like reference image
        textAlign: 'right',
        writingDirection: 'rtl',
        fontFamily: 'ScheherazadeNew',
    },
    verseNumInline: {
        fontSize: 15,
        color: '#00838F', // Teal like reference image verse markers
        fontFamily: 'ScheherazadeNew',
    },
    // ── Transliteration ──
    transliterationText: {
        fontSize: 13,
        lineHeight: 22,
        color: '#2E7D32', // Green for transliteration
        fontStyle: 'italic',
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    // ── Translation (Meal) ──
    translationRow: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        paddingBottom: 8,
        gap: 6,
    },
    mealVerseNum: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8B4513',
        marginTop: 1,
        minWidth: 22,
    },
    translationText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#3E2723',
    },
    // ── Footnotes ──
    footnotesContainer: {
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(139,69,19,0.1)',
    },
    footnoteText: {
        fontSize: 12,
        lineHeight: 18,
        color: '#8B7355',
        marginBottom: 4,
    },
    // ── Navigation Footer ──
    footerNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
        marginTop: 8,
    },
    navBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFF3CC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8D5A3',
        gap: 6,
    },
    navBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
    },
    // ── States ──
    listContent: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 32,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#8B7355',
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
        backgroundColor: '#8B4513',
        borderRadius: 10,
    },
    retryBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    // ── Reciter Picker ──
    reciterScroll: {
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    reciterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(139,69,19,0.08)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    reciterChipActive: {
        backgroundColor: '#8B4513',
        borderColor: '#8B4513',
    },
    reciterChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#5D4037',
    },
    reciterChipTextActive: {
        color: '#FFF',
        fontWeight: '700',
    },
    // ── Color Picker ──
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    colorCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorCircleActive: {
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
});
