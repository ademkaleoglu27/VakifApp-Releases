import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Share,
    Platform,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
    prayerTimesService,
    PrayerTimes,
    CityInfo,
    ActivePrayerInfo
} from '../services/prayerTimesService';
import { getQuoteForPrayer, PrayerQuote } from '../data/prayerQuotesData';
import { theme } from '@/config/theme';

const { width } = Dimensions.get('window');

export const PrayerTimesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [city, setCity] = useState<CityInfo>(prayerTimesService.getSelectedCity());
    const [times, setTimes] = useState<PrayerTimes | null>(null);
    const [activeInfo, setActiveInfo] = useState<ActivePrayerInfo | null>(null);
    const [selectedQuoteTab, setSelectedQuoteTab] = useState<'risale' | 'ayet' | 'hadis'>('risale');
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [hijriDate, setHijriDate] = useState<string>('');

    const loadData = useCallback(async () => {
        try {
            const currentCity = await prayerTimesService.loadSelectedCity();
            setCity(currentCity);
            const now = new Date();
            const prayerTimes = await prayerTimesService.getTimesForDate(now, currentCity);
            setTimes(prayerTimes);
            setActiveInfo(prayerTimesService.getActivePrayerInfo(prayerTimes, now));
            setHijriDate(prayerTimesService.getHijriDate(now));
        } catch (e) {
            console.warn('[PrayerTimes] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Live countdown timer ticking every second
    useEffect(() => {
        if (!times) return;

        const interval = setInterval(() => {
            setActiveInfo(prayerTimesService.getActivePrayerInfo(times, new Date()));
        }, 1000);

        return () => clearInterval(interval);
    }, [times]);

    const formatRemaining = (ms: number): { hours: string; minutes: string; seconds: string } => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return { hours, minutes, seconds };
    };

    const currentQuote: PrayerQuote = getQuoteForPrayer(activeInfo?.currentKey || 'imsak');

    const handleShare = async () => {
        let content = '';
        if (selectedQuoteTab === 'risale') {
            content = `📖 ${currentQuote.title}\n\n"${currentQuote.risale.text}"\n\n— ${currentQuote.risale.source}`;
        } else if (selectedQuoteTab === 'ayet') {
            content = `✨ ${currentQuote.ayet.surah}\n\n"${currentQuote.ayet.meal}"\n\n${currentQuote.ayet.arabic}`;
        } else {
            content = `🌿 Hadis-i Şerif\n\n"${currentQuote.hadis.text}"\n\n— ${currentQuote.hadis.source}`;
        }

        try {
            await Share.share({ message: `${content}\n\nNur Mektebi • Namaz Vakitleri` });
        } catch { }
    };

    const handleCopy = async () => {
        let content = '';
        if (selectedQuoteTab === 'risale') {
            content = `"${currentQuote.risale.text}" — ${currentQuote.risale.source}`;
        } else if (selectedQuoteTab === 'ayet') {
            content = `"${currentQuote.ayet.meal}" (${currentQuote.ayet.surah})`;
        } else {
            content = `"${currentQuote.hadis.text}" (${currentQuote.hadis.source})`;
        }

        await Clipboard.setStringAsync(content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const PRAYER_CARDS = times ? [
        { key: 'imsak', name: 'İmsak', arabic: 'الفجر', time: times.imsak, icon: 'weather-night' },
        { key: 'gunes', name: 'Güneş', arabic: 'الشروق', time: times.gunes, icon: 'weather-sunset-up' },
        { key: 'ogle', name: 'Öğle', arabic: 'الظهر', time: times.ogle, icon: 'weather-sunny' },
        { key: 'ikindi', name: 'İkindi', arabic: 'العصر', time: times.ikindi, icon: 'weather-sunset-down' },
        { key: 'aksam', name: 'Akşam', arabic: 'المغرب', time: times.aksam, icon: 'weather-sunset' },
        { key: 'yatsi', name: 'Yatsı', arabic: 'العشاء', time: times.yatsi, icon: 'moon-waning-crescent' },
    ] : [];

    const remaining = activeInfo ? formatRemaining(activeInfo.remainingMs) : { hours: '00', minutes: '00', seconds: '00' };

    const todayGregorian = new Date().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

            {/* Premium Header */}
            <LinearGradient
                colors={['#064E3B', '#043828']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#ffffff" />
                </TouchableOpacity>

                {/* City & District Selector Pill */}
                <TouchableOpacity
                    style={styles.locationSelector}
                    onPress={() => navigation.navigate('PrayerSettingsScreen')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="location-sharp" size={16} color="#F59E0B" />
                    <Text style={styles.locationCityName} numberOfLines={1}>
                        {city.name}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#D1FAE5" />
                </TouchableOpacity>

                <View style={styles.headerRightGroup}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => navigation.navigate('QiblaCompassScreen')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="compass-outline" size={22} color="#F59E0B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => navigation.navigate('PrayerSettingsScreen')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-outline" size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {loading || !times || !activeInfo ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#064E3B" />
                    <Text style={styles.loadingText}>Namaz Vakitleri Hesaplanıyor...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Date Banner (Hicri & Miladi) */}
                    <View style={styles.dateBanner}>
                        <View style={styles.dateRow}>
                            <Ionicons name="moon-outline" size={14} color="#B45309" />
                            <Text style={styles.hijriDateText}>{hijriDate}</Text>
                        </View>
                        <Text style={styles.gregorianDateText}>{todayGregorian}</Text>
                    </View>

                    {/* 1. HERO COUNTDOWN CARD */}
                    <LinearGradient
                        colors={['#064E3B', '#022C22']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        {/* Decorative Background Element */}
                        <View style={styles.heroDecorativeCircle} />

                        <View style={styles.heroTopRow}>
                            <View style={styles.activePill}>
                                <View style={styles.pulsingDot} />
                                <Text style={styles.activePillText}>{activeInfo.currentName} Vakti</Text>
                            </View>
                            <View style={styles.nextPrayerBadge}>
                                <Text style={styles.nextPrayerLabel}>
                                    Sıradaki: <Text style={styles.nextPrayerBold}>{activeInfo.nextName} ({activeInfo.nextTime})</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Large Luxury Countdown Clock */}
                        <Text style={styles.countdownTitle}>{activeInfo.nextName} Vaktine Kalan Süre</Text>
                        <View style={styles.timerRow}>
                            <View style={styles.timeBox}>
                                <Text style={styles.timeDigit}>{remaining.hours}</Text>
                                <Text style={styles.timeUnit}>SAAT</Text>
                            </View>
                            <Text style={styles.timeColon}>:</Text>
                            <View style={styles.timeBox}>
                                <Text style={styles.timeDigit}>{remaining.minutes}</Text>
                                <Text style={styles.timeUnit}>DAKİKA</Text>
                            </View>
                            <Text style={styles.timeColon}>:</Text>
                            <View style={styles.timeBox}>
                                <Text style={[styles.timeDigit, { color: '#FBBF24' }]}>{remaining.seconds}</Text>
                                <Text style={styles.timeUnit}>SANİYE</Text>
                            </View>
                        </View>

                        {/* Smooth Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <LinearGradient
                                colors={['#F59E0B', '#FBBF24']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${Math.round(activeInfo.progress * 100)}%` }]}
                            />
                        </View>
                    </LinearGradient>

                    {/* 2. 6 PRAYER TIME TILES (2 Columns Premium Grid) */}
                    <View style={styles.timesGrid}>
                        {PRAYER_CARDS.map((item) => {
                            const isCurrent = activeInfo.currentKey === item.key;
                            return (
                                <View
                                    key={item.key}
                                    style={[
                                        styles.timeTile,
                                        isCurrent && styles.timeTileActive,
                                    ]}
                                >
                                    <View style={styles.tileHeaderRow}>
                                        <View style={[styles.tileIconCircle, isCurrent && styles.tileIconCircleActive]}>
                                            <MaterialCommunityIcons
                                                name={item.icon as any}
                                                size={18}
                                                color={isCurrent ? '#F59E0B' : '#064E3B'}
                                            />
                                        </View>
                                        <Text style={[styles.tileArabic, isCurrent && styles.tileArabicActive]}>
                                            {item.arabic}
                                        </Text>
                                    </View>

                                    <Text style={[styles.timeTileName, isCurrent && styles.timeTileNameActive]}>
                                        {item.name}
                                    </Text>
                                    <Text style={[styles.timeTileHour, isCurrent && styles.timeTileHourActive]}>
                                        {item.time}
                                    </Text>

                                    {isCurrent ? (
                                        <View style={styles.currentIndicator}>
                                            <Text style={styles.currentIndicatorText}>Vakit İçinde</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.placeholderIndicator} />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* 3. QUICK SHORTCUTS ROW (Kıble & Zikirmatik) */}
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickBtn}
                            onPress={() => navigation.navigate('QiblaCompassScreen')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#064E3B', '#043828']}
                                style={styles.quickBtnGradient}
                            >
                                <MaterialCommunityIcons name="compass-rose" size={22} color="#F59E0B" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.quickBtnTitle}>Kıble Pusulası</Text>
                                    <Text style={styles.quickBtnSub}>Kâbe Yönü & Mesafe</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickBtn}
                            onPress={() => navigation.navigate('ZikirmatikScreen')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#78350F', '#451A03']}
                                style={styles.quickBtnGradient}
                            >
                                <MaterialCommunityIcons name="circle-slice-8" size={22} color="#FBBF24" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.quickBtnTitle}>Akıllı Zikirmatik</Text>
                                    <Text style={styles.quickBtnSub}>Tesbihat & Zikir</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* 4. VAKTE ÖZEL MANEVİ İLHAM & RİSALE-İ NUR KARTI */}
                    <View style={styles.quoteCard}>
                        <View style={styles.quoteCardHeader}>
                            <View style={styles.quoteHeaderTitleGroup}>
                                <Ionicons name="book" size={18} color="#B45309" />
                                <Text style={styles.quoteHeaderTitle}>{currentQuote.title}</Text>
                            </View>
                            <View style={styles.quoteActions}>
                                <TouchableOpacity onPress={handleCopy} style={styles.quoteIconBtn}>
                                    <Ionicons
                                        name={copySuccess ? 'checkmark' : 'copy-outline'}
                                        size={16}
                                        color={copySuccess ? '#15803D' : '#78716C'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleShare} style={styles.quoteIconBtn}>
                                    <Ionicons name="share-social-outline" size={16} color="#78716C" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Tabs */}
                        <View style={styles.quoteTabs}>
                            <TouchableOpacity
                                style={[styles.quoteTab, selectedQuoteTab === 'risale' && styles.quoteTabActive]}
                                onPress={() => setSelectedQuoteTab('risale')}
                            >
                                <Text style={[styles.quoteTabText, selectedQuoteTab === 'risale' && styles.quoteTabTextActive]}>
                                    Risale-i Nur (9. Söz)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.quoteTab, selectedQuoteTab === 'ayet' && styles.quoteTabActive]}
                                onPress={() => setSelectedQuoteTab('ayet')}
                            >
                                <Text style={[styles.quoteTabText, selectedQuoteTab === 'ayet' && styles.quoteTabTextActive]}>
                                    Âyet-i Kerime
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.quoteTab, selectedQuoteTab === 'hadis' && styles.quoteTabActive]}
                                onPress={() => setSelectedQuoteTab('hadis')}
                            >
                                <Text style={[styles.quoteTabText, selectedQuoteTab === 'hadis' && styles.quoteTabTextActive]}>
                                    Hadis-i Şerif
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        <View style={styles.quoteBody}>
                            {selectedQuoteTab === 'risale' && (
                                <>
                                    <Text style={styles.quoteMainText}>"{currentQuote.risale.text}"</Text>
                                    <Text style={styles.quoteSourceText}>— {currentQuote.risale.source}</Text>
                                </>
                            )}
                            {selectedQuoteTab === 'ayet' && (
                                <>
                                    <Text style={styles.quoteArabic}>{currentQuote.ayet.arabic}</Text>
                                    <Text style={styles.quoteMainText}>"{currentQuote.ayet.meal}"</Text>
                                    <Text style={styles.quoteSourceText}>— {currentQuote.ayet.surah}</Text>
                                </>
                            )}
                            {selectedQuoteTab === 'hadis' && (
                                <>
                                    <Text style={styles.quoteMainText}>"{currentQuote.hadis.text}"</Text>
                                    <Text style={styles.quoteSourceText}>— {currentQuote.hadis.source}</Text>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAF8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
    },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        maxWidth: '55%',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    locationCityName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginHorizontal: 6,
    },
    headerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    dateBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hijriDateText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400E',
    },
    gregorianDateText: {
        fontSize: 11,
        color: '#78350F',
    },
    heroCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        elevation: 8,
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    heroDecorativeCircle: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    activePillText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    nextPrayerBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    nextPrayerLabel: {
        fontSize: 11,
        color: '#FEF3C7',
    },
    nextPrayerBold: {
        fontWeight: 'bold',
        color: '#FBBF24',
    },
    countdownTitle: {
        fontSize: 12,
        color: '#A7F3D0',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    timerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    timeBox: {
        alignItems: 'center',
        minWidth: 60,
    },
    timeDigit: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1,
        fontVariant: ['tabular-nums'],
    },
    timeUnit: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#A7F3D0',
        letterSpacing: 1,
        marginTop: -2,
    },
    timeColon: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 4,
        marginBottom: 12,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    timesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 16,
    },
    timeTile: {
        width: (width - 42) / 3,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    timeTileActive: {
        backgroundColor: '#064E3B',
        borderColor: '#F59E0B',
        borderWidth: 2,
        elevation: 6,
        shadowColor: '#064E3B',
        shadowOpacity: 0.3,
    },
    tileHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 6,
    },
    tileIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileIconCircleActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    tileArabic: {
        fontSize: 11,
        color: '#9CA3AF',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    tileArabicActive: {
        color: '#FDE68A',
    },
    timeTileName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 2,
    },
    timeTileNameActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    timeTileHour: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    timeTileHourActive: {
        color: '#FBBF24',
        fontSize: 17,
    },
    currentIndicator: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 6,
    },
    currentIndicatorText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#064E3B',
    },
    placeholderIndicator: {
        height: 15,
        marginTop: 6,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    quickBtn: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
    },
    quickBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    quickBtnTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    quickBtnSub: {
        fontSize: 10,
        color: '#D1FAE5',
        marginTop: 1,
    },
    quoteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    quoteCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    quoteHeaderTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quoteHeaderTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#78350F',
    },
    quoteActions: {
        flexDirection: 'row',
        gap: 6,
    },
    quoteIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quoteTabs: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        padding: 3,
        marginBottom: 12,
    },
    quoteTab: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 8,
    },
    quoteTabActive: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
    },
    quoteTabText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    quoteTabTextActive: {
        color: '#78350F',
        fontWeight: 'bold',
    },
    quoteBody: {
        paddingTop: 4,
    },
    quoteArabic: {
        fontSize: 18,
        color: '#064E3B',
        textAlign: 'right',
        lineHeight: 28,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginBottom: 8,
    },
    quoteMainText: {
        fontSize: 13,
        lineHeight: 20,
        color: '#374151',
        fontStyle: 'italic',
    },
    quoteSourceText: {
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 8,
        fontWeight: '600',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#064E3B',
        fontWeight: '600',
    },
});
