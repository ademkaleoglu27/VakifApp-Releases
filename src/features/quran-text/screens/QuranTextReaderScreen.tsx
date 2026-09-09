import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar, Platform, Switch, ScrollView, Alert, useWindowDimensions, InteractionManager
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/config/theme';
import { QuranTextService, SurahDetail, Verse, RECITERS } from '../services/QuranTextService';
import { useQuranTextStore } from '../store/useQuranTextStore';
import { useAudio } from '@/context/AudioContext';
import { audioSyncEngine } from '@/services/audioSyncEngine';
import { lastReadService } from '@/services/lastReadService';

const BISMILLAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ';

// Font options
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
const toArabicNum = (n: number | string | undefined): string => {
    if (!n) return '١';
    return String(n).split('').map(d => {
        const parsed = parseInt(d, 10);
        return isNaN(parsed) ? d : (ARABIC_NUMS[parsed] || d);
    }).join('');
};

export const QuranTextReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const rawSurahId = route.params?.surahId;
    const rawStartVerse = route.params?.startVerse;

    const surahId = Math.max(1, Math.min(114, Number(rawSurahId) || 1));
    const startVerse = Math.max(1, Number(rawStartVerse) || 1);

    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    // Unlock Orientation for Reading
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.unlockAsync().catch(() => { });
            return () => {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
            };
        }, [])
    );

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
    const mushafScrollRef = useRef<ScrollView>(null);
    const { playTrack, currentTrack, isPlaying, togglePlayPause, isLoading: audioLoading, position, duration, seekTo } = useAudio();

    // Mode: Mushaf (continuous text like printed Quran) vs List (verse-by-verse with meal)
    const [isMushafMode, setIsMushafMode] = useState<boolean>(isLandscape);
    // Landscape Fullscreen (Distraction-Free) Toggle
    const [isLandscapeHeaderVisible, setIsLandscapeHeaderVisible] = useState<boolean>(true);

    useEffect(() => {
        if (isLandscape) {
            setIsMushafMode(true);
        }
    }, [isLandscape]);

    // Red Lafzatullah helper (matches printed Mushaf style - Reference Screenshot 4)
    const renderQuranVerseWithLafzatullah = useCallback((verseText: string, textColor: string) => {
        if (!verseText) return null;
        const regex = /((?:[اوبف]?لِ?ل[َّّٰ\u0670]*ه[\u064B-\u0652]?))/g;
        const parts = verseText.split(regex);
        return parts.map((part, index) => {
            if (part && regex.test(part)) {
                return (
                    <Text key={index} style={{ color: '#D32F2F', fontWeight: 'bold' }}>
                        {part}
                    </Text>
                );
            }
            return (
                <Text key={index} style={{ color: textColor }}>
                    {part}
                </Text>
            );
        });
    }, []);

    const trackId = `quran-surah-${surahId}-r${selectedReciterId || 7}`;
    const isCurrentSurahPlaying = currentTrack?.id === trackId && isPlaying;

    // ── Karaoke Timestamp Mapping ───────────────────────────
    const verseSegments = React.useMemo(() => {
        try {
            if (!surah?.verses || !duration || duration <= 0) return [];
            return audioSyncEngine.calculateVerseSegments(surah.verses, duration);
        } catch {
            return [];
        }
    }, [surah?.verses, duration]);

    const activeVerseNumber = React.useMemo(() => {
        try {
            if (!isCurrentSurahPlaying || !verseSegments.length || !position) return null;
            return audioSyncEngine.getActiveSegmentId(position, verseSegments);
        } catch {
            return null;
        }
    }, [isCurrentSurahPlaying, position, verseSegments]);

    // Auto-scroll to active verse when listening
    useEffect(() => {
        if (activeVerseNumber && surah?.verses?.length && isCurrentSurahPlaying) {
            const verseIdx = surah.verses.findIndex(v => v.verse_number === activeVerseNumber);
            if (verseIdx >= 0 && flatListRef.current) {
                try {
                    flatListRef.current.scrollToIndex({
                        index: verseIdx,
                        animated: true,
                        viewPosition: 0.3,
                    });
                } catch { }
            }
        }
    }, [activeVerseNumber, isCurrentSurahPlaying]);

    // Instant Tap-to-Play on verse
    const handleVerseTap = async (verseNum: number) => {
        try {
            const targetSeek = audioSyncEngine.getSeekMs(verseNum, verseSegments);
            if (currentTrack?.id === trackId) {
                await seekTo(targetSeek);
                if (!isPlaying) {
                    await togglePlayPause();
                }
            } else {
                await handlePlaySurah();
                setTimeout(() => {
                    seekTo(targetSeek).catch(() => { });
                }, 600);
            }
        } catch (e) {
            console.warn('[QuranTextReader] Verse tap error:', e);
        }
    };

    // ── Audio Playback ──────────────────────────────────────
    const handlePlaySurah = async () => {
        try {
            if (currentTrack?.id === trackId) {
                await togglePlayPause();
                return;
            }

            if (selectedReciterId === 0) {
                if (surah?.audio?.mp3) {
                    await playTrack({
                        id: trackId,
                        title: `${surah.name} Suresi • Türkçe Meal`,
                        source: { uri: surah.audio.mp3 },
                    });
                } else {
                    Alert.alert('Bilgi', 'Türkçe meal sesi bulunamadı.');
                }
                return;
            }

            const audioUrl = await QuranTextService.getReciterAudioUrl(selectedReciterId || 7, surahId);
            if (!audioUrl) {
                Alert.alert('Bilgi', 'Ses dosyası bulunamadı.');
                return;
            }

            const reciter = RECITERS.find(r => r.id === selectedReciterId);
            const reciterLabel = reciter ? `${reciter.name}${reciter.style ? ` (${reciter.style})` : ''}` : 'Mişari el-Afasi';

            await playTrack({
                id: trackId,
                title: `${surah?.name || ''} Suresi • ${reciterLabel}`,
                source: { uri: audioUrl },
            });
        } catch (e) {
            console.warn('[QuranTextReader] Audio play error:', e);
        }
    };

    // ── Load Surah ─────────────────────────────────────────
    const loadSurah = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await QuranTextService.getSurah(surahId, selectedAuthorId);
            setSurah(data);
            setLastPosition(surahId, startVerse || 1);

            lastReadService.recordLastRead({
                id: 'quran_text',
                type: 'quran_text',
                title: `${data.name} Suresi (Meal)`,
                subtitle: `${data.name_translation_tr || data.name} • ${data.verse_count || data.verses?.length || 0} Âyet`,
                screenName: 'QuranTextReaderScreen',
                params: { surahId, startVerse },
            }).catch(() => { });

            // Scroll to startVerse if specified
            if (startVerse > 1 && data.verses?.length) {
                const verseIndex = data.verses.findIndex((v: Verse) => v.verse_number >= startVerse);
                if (verseIndex > 0) {
                    InteractionManager.runAfterInteractions(() => {
                        setTimeout(() => {
                            try {
                                flatListRef.current?.scrollToIndex({
                                    index: verseIndex,
                                    animated: true,
                                    viewOffset: 20,
                                });
                            } catch { }
                        }, 350);
                    });
                }
            }
        } catch (e: any) {
            setError(e?.message || 'Sure yüklenemedi. Lütfen tekrar deneyiniz.');
        } finally {
            setLoading(false);
        }
    }, [surahId, selectedAuthorId, startVerse, setLastPosition]);

    useEffect(() => {
        loadSurah();
    }, [loadSurah]);

    // ── Navigate to Adjacent Surah ─────────────────────────
    const goToSurah = useCallback((id: number) => {
        if (id < 1 || id > 114) return;
        navigation.replace('QuranTextReaderScreen', { surahId: id, startVerse: 1 });
    }, [navigation]);

    // ── Render Verse (Hybrid Flow with Karaoke Sync) ───────
    const renderVerse = useCallback(({ item }: { item: Verse }) => {
        if (!item) return null;

        const safeFontSize = Math.max(0.7, Math.min(2.0, fontSize || 1));
        const arabicFontSize = Math.round(28 * safeFontSize);
        const translationFontSize = Math.round(15 * safeFontSize);
        const translitFontSize = Math.round(13 * safeFontSize);
        const isActive = isCurrentSurahPlaying && activeVerseNumber === item.verse_number;

        return (
            <TouchableOpacity
                style={[styles.verseRow, isActive && styles.verseRowActive]}
                onPress={() => handleVerseTap(item.verse_number)}
                activeOpacity={0.7}
            >
                {/* Karaoke Active Soundwave Badge */}
                {isActive && (
                    <View style={styles.karaokeBadge}>
                        <Ionicons name="volume-high" size={13} color="#D97706" />
                        <Text style={styles.karaokeBadgeText}>Okunuyor</Text>
                    </View>
                )}

                {/* Arabic Text with inline verse number */}
                <View style={styles.arabicLine}>
                    <Text
                        style={[
                            styles.arabicText,
                            {
                                fontSize: arabicFontSize,
                                lineHeight: Math.round(arabicFontSize * 2.0),
                                fontFamily: arabicFont || 'ScheherazadeNew',
                                color: arabicColor || '#1A237E'
                            },
                            isActive && styles.arabicTextActive,
                        ]}
                        selectable
                    >
                        {item.verse || ''}
                        {' '}
                        <Text style={[
                            styles.verseNumInline,
                            { fontSize: Math.round(arabicFontSize * 0.55), fontFamily: arabicFont || 'ScheherazadeNew' },
                            isActive && { color: '#D97706' }
                        ]}>
                            ﴿{toArabicNum(item.verse_number)}﴾
                        </Text>
                    </Text>
                </View>

                {/* Transliteration (optional) */}
                {showTransliteration && !!item.transcription && (
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
                            {item.translation?.footnotes && Array.isArray(item.translation.footnotes) && item.translation.footnotes.length > 0 && (
                                <View style={styles.footnotesContainer}>
                                    {item.translation.footnotes.map((fn: any) => (
                                        <Text key={fn?.id || Math.random()} style={styles.footnoteText}>
                                            [{fn?.number || '*'}] {fn?.text || ''}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [fontSize, showTransliteration, showTranslation, isCurrentSurahPlaying, activeVerseNumber, arabicFont, arabicColor]);

    // ── Surah Header Component ─────────────────────────────
    const SurahHeader = () => {
        if (!surah) return null;
        return (
            <View style={styles.surahHeader}>
                <LinearGradient
                    colors={['#FFF9E6', '#FFF3CC']}
                    style={styles.surahTitleCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.surahArabicTitle}>{surah.name_original || ''}</Text>
                    <Text style={styles.surahTrTitle}>
                        ({surah.id}) {surah.name || ''} Suresi
                    </Text>
                    <Text style={styles.surahMeta}>
                        {surah.verse_count || surah.verses?.length || 0} Ayet • {surah.name_translation_tr || surah.name_en || ''}
                    </Text>
                </LinearGradient>
                {surahId !== 9 && surahId !== 1 && (
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
                <TouchableOpacity style={styles.navBtn} onPress={() => goToSurah(surahId - 1)}>
                    <Ionicons name="chevron-back" size={18} color="#8B4513" />
                    <Text style={styles.navBtnText}>Önceki</Text>
                </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {surahId < 114 && (
                <TouchableOpacity style={styles.navBtn} onPress={() => goToSurah(surahId + 1)}>
                    <Text style={styles.navBtnText}>Sonraki</Text>
                    <Ionicons name="chevron-forward" size={18} color="#8B4513" />
                </TouchableOpacity>
            )}
        </View>
    );

    // ── Settings Panel ─────────────────────────────────────
    const SettingsPanel = () => (
        <View style={styles.settingsPanel}>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Transliterasyon (Okunuş)</Text>
                <Switch value={showTransliteration} onValueChange={setShowTransliteration} trackColor={{ false: '#e2e8f0', true: '#8B4513' }} thumbColor="white" />
            </View>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Meal Göster</Text>
                <Switch value={showTranslation} onValueChange={setShowTranslation} trackColor={{ false: '#e2e8f0', true: '#8B4513' }} thumbColor="white" />
            </View>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Yazı Boyutu</Text>
                <View style={styles.fontSizeControls}>
                    <TouchableOpacity style={styles.fontSizeBtn} onPress={() => useQuranTextStore.getState().setFontSize(Math.max(0.7, (fontSize || 1) - 0.1))}>
                        <Text style={styles.fontSizeBtnText}>A-</Text>
                    </TouchableOpacity>
                    <Text style={styles.fontSizeValue}>{Math.round((fontSize || 1) * 100)}%</Text>
                    <TouchableOpacity style={styles.fontSizeBtn} onPress={() => useQuranTextStore.getState().setFontSize(Math.min(1.8, (fontSize || 1) + 0.1))}>
                        <Text style={styles.fontSizeBtnText}>A+</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Arapça Yazı Tipi</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reciterScroll}>
                {FONT_OPTIONS.map(f => (
                    <TouchableOpacity key={f.key} style={[styles.reciterChip, f.key === arabicFont && styles.reciterChipActive]} onPress={() => setArabicFont(f.key)}>
                        <Text style={[styles.reciterChipText, f.key === arabicFont && styles.reciterChipTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Arapça Renk</Text>
                <View style={styles.colorRow}>
                    {COLOR_OPTIONS.map(c => (
                        <TouchableOpacity key={c.key} onPress={() => setArabicColor(c.key)} style={[styles.colorCircle, { backgroundColor: c.key }, arabicColor === c.key && styles.colorCircleActive]} />
                    ))}
                </View>
            </View>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Hafız / Okuyucu</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reciterScroll}>
                {RECITERS.map(r => (
                    <TouchableOpacity key={r.id} style={[styles.reciterChip, r.id === selectedReciterId && styles.reciterChipActive]} onPress={() => setSelectedReciterId(r.id)}>
                        <Text style={[styles.reciterChipText, r.id === selectedReciterId && styles.reciterChipTextActive]}>{r.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" />

                {!isLandscape && (
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="arrow-back" size={20} color="#5D4037" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('QuranTextMenuScreen')} style={styles.topBarTitle} activeOpacity={0.7}>
                            <Text style={styles.topBarTitleText} numberOfLines={1}>{surah ? `${surah.name} Suresi` : 'Yükleniyor...'}</Text>
                            <Ionicons name="chevron-down" size={14} color="#8B7355" />
                        </TouchableOpacity>
                        {/* Mode Toggle: Mushaf Akışı vs Âyet Listesi */}
                        <TouchableOpacity
                            onPress={() => setIsMushafMode(!isMushafMode)}
                            style={[styles.topBarBtn, isMushafMode && styles.topBarBtnActive]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name={isMushafMode ? "book" : "list"} size={20} color={isMushafMode ? "#fff" : "#5D4037"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { const page = surah?.page_number || 1; navigation.navigate('QuranReaderScreen', { initialPage: page }); }} style={styles.topBarBtn}>
                            <Ionicons name="images-outline" size={20} color="#5D4037" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.topBarBtn}>
                            <Ionicons name={showSettings ? 'settings' : 'settings-outline'} size={22} color="#5D4037" />
                        </TouchableOpacity>
                        {surah?.audio?.mp3 && (
                            <TouchableOpacity onPress={handlePlaySurah} style={[styles.topBarBtn, isCurrentSurahPlaying && styles.topBarBtnActive]} disabled={audioLoading}>
                                {audioLoading && currentTrack?.id === trackId ? <ActivityIndicator size="small" color="#8B4513" /> : <Ionicons name={isCurrentSurahPlaying ? 'pause' : 'play'} size={22} color={isCurrentSurahPlaying ? '#fff' : '#5D4037'} />}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {isLandscape && isLandscapeHeaderVisible && (
                    <View style={styles.landscapeHeader}>
                        <TouchableOpacity style={styles.landscapeBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="arrow-back" size={20} color="#5D4037" />
                        </TouchableOpacity>
                        <Text style={styles.landscapeTitle} numberOfLines={1}>
                            {surah ? `(${surah.id}) ${surah.name} Sûresi` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => setIsMushafMode(!isMushafMode)}
                                style={[styles.landscapeBtn, isMushafMode && styles.topBarBtnActive]}
                            >
                                <Ionicons name={isMushafMode ? "book" : "list"} size={18} color={isMushafMode ? "#fff" : "#5D4037"} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.landscapeBtn}>
                                <Ionicons name={showSettings ? 'settings' : 'settings-outline'} size={20} color="#5D4037" />
                            </TouchableOpacity>
                            {surah?.audio?.mp3 && (
                                <TouchableOpacity onPress={handlePlaySurah} style={[styles.landscapeBtn, isCurrentSurahPlaying && styles.topBarBtnActive]} disabled={audioLoading}>
                                    <Ionicons name={isCurrentSurahPlaying ? 'pause' : 'play'} size={18} color={isCurrentSurahPlaying ? '#fff' : '#5D4037'} />
                                </TouchableOpacity>
                            )}
                            {/* Fullscreen Toggle Button */}
                            <TouchableOpacity
                                onPress={() => setIsLandscapeHeaderVisible(false)}
                                style={styles.landscapeBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="expand-outline" size={18} color="#5D4037" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Floating button to restore menu in landscape fullscreen */}
                {isLandscape && !isLandscapeHeaderVisible && (
                    <TouchableOpacity
                        onPress={() => setIsLandscapeHeaderVisible(true)}
                        style={styles.landscapeFloatingToggle}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="contract-outline" size={20} color="#5D4037" />
                    </TouchableOpacity>
                )}

                {showSettings && <SettingsPanel />}

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#8B4513" />
                        <Text style={styles.loadingText}>Sure yükleniyor...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={loadSurah}><Text style={styles.retryBtnText}>Tekrar Dene</Text></TouchableOpacity>
                    </View>
                ) : isMushafMode ? (
                    /* CONTINUOUS MUSHAF FLOW (Matches Sözler Landscape Reference Screenshot 4) */
                    <ScrollView
                        ref={mushafScrollRef}
                        contentContainerStyle={[styles.mushafScrollContent, isLandscape && styles.mushafScrollContentLandscape]}
                        showsVerticalScrollIndicator={false}
                    >
                        <SurahHeader />

                        <View style={[styles.mushafCard, isLandscape && styles.mushafCardLandscape]}>
                            <Text
                                style={[
                                    styles.mushafParagraph,
                                    {
                                        fontSize: Math.round(28 * Math.max(0.7, Math.min(2.0, fontSize || 1))),
                                        lineHeight: Math.round(54 * Math.max(0.7, Math.min(2.0, fontSize || 1))),
                                        fontFamily: arabicFont || 'ScheherazadeNew',
                                    }
                                ]}
                                selectable
                            >
                                {(surah?.verses || []).map((v) => {
                                    const isActive = isCurrentSurahPlaying && activeVerseNumber === v.verse_number;
                                    return (
                                        <Text
                                            key={v.verse_number}
                                            onPress={() => handleVerseTap(v.verse_number)}
                                            style={isActive ? styles.mushafActiveVerse : undefined}
                                        >
                                            {renderQuranVerseWithLafzatullah(
                                                v.verse || '',
                                                isActive ? '#B45309' : (arabicColor || '#1B1B1B')
                                            )}
                                            {' '}
                                            <Text
                                                style={[
                                                    styles.mushafVerseStop,
                                                    {
                                                        fontSize: Math.round(28 * Math.max(0.7, Math.min(2.0, fontSize || 1)) * 0.58),
                                                        fontFamily: arabicFont || 'ScheherazadeNew'
                                                    },
                                                    isActive && { color: '#D97706' }
                                                ]}
                                            >
                                                ﴿{toArabicNum(v.verse_number)}﴾
                                            </Text>
                                            {'  '}
                                        </Text>
                                    );
                                })}
                            </Text>
                        </View>

                        {/* Selected verse quick meal preview in Mushaf mode */}
                        {showTranslation && activeVerseNumber && (
                            <View style={styles.mushafActiveMealBox}>
                                <Text style={styles.mushafActiveMealTitle}>
                                    {activeVerseNumber}. Âyet Meali:
                                </Text>
                                <Text style={styles.mushafActiveMealContent}>
                                    {surah?.verses?.find(v => v.verse_number === activeVerseNumber)?.translation?.text || ''}
                                </Text>
                            </View>
                        )}

                        <SurahFooter />
                    </ScrollView>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={surah?.verses || []}
                        keyExtractor={(item, idx) => item?.id ? String(item.id) : `${surahId}-${idx}`}
                        renderItem={renderVerse}
                        ListHeaderComponent={<SurahHeader />}
                        ListFooterComponent={<SurahFooter />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={7}
                        removeClippedSubviews={Platform.OS === 'android'}
                        onScrollToIndexFailed={(info) => {
                            setTimeout(() => {
                                try { flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true }); } catch { }
                            }, 200);
                        }}
                    />
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E7',
    },
    landscapeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFF3CC',
        borderBottomWidth: 1,
        borderBottomColor: '#E8D5A3',
    },
    landscapeBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: 'rgba(139,69,19,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    landscapeTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#5D4037',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    mushafScrollContent: {
        paddingHorizontal: 12,
        paddingBottom: 40,
    },
    mushafScrollContentLandscape: {
        paddingHorizontal: 28,
        paddingBottom: 40,
    },
    mushafCard: {
        backgroundColor: '#FFFDF5',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: '#E8DFCC',
        marginVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    mushafCardLandscape: {
        paddingHorizontal: 28,
        paddingVertical: 22,
        marginHorizontal: 8,
    },
    mushafParagraph: {
        textAlign: 'justify',
        writingDirection: 'rtl',
    },
    mushafActiveVerse: {
        backgroundColor: '#FEF3C7',
    },
    mushafVerseStop: {
        color: '#8B4513',
        fontWeight: 'bold',
    },
    mushafActiveMealBox: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 14,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#E8D5A3',
    },
    mushafActiveMealTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: 4,
    },
    mushafActiveMealContent: {
        fontSize: 14,
        color: '#4B3621',
        lineHeight: 22,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    floatingLandscapeBack: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 248, 231, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        borderWidth: 1,
        borderColor: '#E8D5A3',
    },
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
        color: '#1A237E',
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
        color: '#B71C1C',
        fontFamily: 'ScheherazadeNew',
    },
    verseRow: {
        paddingVertical: 6,
        paddingHorizontal: 6,
        marginVertical: 2,
        borderRadius: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(139,69,19,0.08)',
    },
    verseRowActive: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },
    karaokeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginBottom: 2,
    },
    karaokeBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#B45309',
    },
    arabicTextActive: {
        color: '#92400E',
    },
    arabicLine: {
        paddingVertical: 6,
        paddingHorizontal: 2,
    },
    arabicText: {
        fontSize: 28,
        lineHeight: 56,
        color: '#1A237E',
        textAlign: 'right',
        writingDirection: 'rtl',
        fontFamily: 'ScheherazadeNew',
    },
    verseNumInline: {
        fontSize: 15,
        color: '#00838F',
        fontFamily: 'ScheherazadeNew',
    },
    transliterationText: {
        fontSize: 13,
        lineHeight: 22,
        color: '#2E7D32',
        fontStyle: 'italic',
        marginBottom: 4,
        paddingHorizontal: 4,
    },
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
    landscapeFloatingToggle: {
        position: 'absolute',
        top: 12,
        right: 16,
        zIndex: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        borderRadius: 20,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2D9C2',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
});
