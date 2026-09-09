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
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const { width } = Dimensions.get('window');

export const PrayerTimesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [city, setCity] = useState<CityInfo>(prayerTimesService.getSelectedCity());
    const [times, setTimes] = useState<PrayerTimes | null>(null);
    const [activeInfo, setActiveInfo] = useState<ActivePrayerInfo | null>(null);
    const [selectedQuoteTab, setSelectedQuoteTab] = useState<'risale' | 'ayet' | 'hadis'>('risale');
    const [loading, setLoading] = useState(true);
    const [gpsDetecting, setGpsDetecting] = useState(false);
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

    // Auto-detect GPS on first launch or when requested
    const handleDetectGps = async () => {
        setGpsDetecting(true);
        try {
            const detected = await prayerTimesService.detectLocationAndSetCity();
            if (detected) {
                setCity(detected);
                const now = new Date();
                const prayerTimes = await prayerTimesService.getTimesForDate(now, detected);
                setTimes(prayerTimes);
                setActiveInfo(prayerTimesService.getActivePrayerInfo(prayerTimes, now));
            }
        } catch (err) {
            console.warn('[PrayerTimes] GPS detection error:', err);
        } finally {
            setGpsDetecting(false);
        }
    };

    // Trigger GPS auto-detection once on mount if city is default İstanbul (id 34)
    useEffect(() => {
        AsyncStorage.getItem('@prayer_auto_gps_done_v2').then(val => {
            if (!val) {
                AsyncStorage.setItem('@prayer_auto_gps_done_v2', 'true');
                handleDetectGps();
            }
        }).catch(() => {});
    }, []);

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
            await Share.share({ message: `${content}\n\nVakıfApp • Namaz Vakitleri (Diyanet Uyumlu)` });
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
            <StatusBar barStyle="light-content" backgroundColor="#041D15" />

            <LinearGradient
                colors={['#041D15', '#062B20', '#02120C']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Premium Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#D4AF37" />
                </TouchableOpacity>

                {/* City & District Selector Pill */}
                <TouchableOpacity
                    style={styles.locationSelector}
                    onPress={() => navigation.navigate('PrayerSettingsScreen')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="location-sharp" size={15} color="#D4AF37" style={{ marginRight: 5 }} />
                    <Text style={styles.locationCityName} numberOfLines={1}>
                        {city.name}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color="#A7F3D0" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <View style={styles.headerRightGroup}>
                    <TouchableOpacity
                        style={[styles.headerBtn, gpsDetecting && styles.headerBtnActive]}
                        onPress={handleDetectGps}
                        disabled={gpsDetecting}
                        activeOpacity={0.7}
                    >
                        {gpsDetecting ? (
                            <ActivityIndicator size="small" color="#D4AF37" />
                        ) : (
                            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#D4AF37" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => navigation.navigate('QiblaCompassScreen')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="compass-outline" size={22} color="#D4AF37" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => navigation.navigate('PrayerSettingsScreen')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-outline" size={20} color="#A7F3D0" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading || !times || !activeInfo ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#D4AF37" />
                    <Text style={styles.loadingText}>Diyanet Namaz Vakitleri Yükleniyor...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Date Ribbon (Hicri & Miladi) */}
                    <View style={styles.dateBanner}>
                        <View style={styles.dateRow}>
                            <Ionicons name="moon" size={13} color="#D4AF37" />
                            <Text style={styles.hijriDateText}>{hijriDate}</Text>
                        </View>
                        <View style={styles.dateDividerDot} />
                        <Text style={styles.gregorianDateText}>{todayGregorian}</Text>
                    </View>

                    {/* 1. HERO COUNTDOWN CARD (Emerald & Gold Palace Style) */}
                    <LinearGradient
                        colors={['#08382A', '#042219', '#02150F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        {/* Golden Decorative Halo */}
                        <View style={styles.heroGlowCircle} />

                        {/* Top Badges */}
                        <View style={styles.heroTopRow}>
                            <View style={styles.activePill}>
                                <View style={styles.pulsingDot} />
                                <Text style={styles.activePillText}>{activeInfo.currentName} Vakti</Text>
                            </View>

                            <View style={styles.nextPrayerBadge}>
                                <Ionicons name="time-outline" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                                <Text style={styles.nextPrayerLabel}>
                                    Sıradaki: <Text style={styles.nextPrayerBold}>{activeInfo.nextName} {activeInfo.nextTime}</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Large Luxury Countdown Display */}
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

                        {/* Celestial Arc Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <LinearGradient
                                colors={['#D4AF37', '#FBBF24', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${Math.round(activeInfo.progress * 100)}%` }]}
                            />
                        </View>

                        <View style={styles.progressBottomRow}>
                            <Text style={styles.progressSubText}>Vakit İlerlemesi</Text>
                            <Text style={styles.progressPercentText}>%{Math.round(activeInfo.progress * 100)}</Text>
                        </View>
                    </LinearGradient>

                    {/* Diyanet Synchronization Badge */}
                    <View style={styles.diyanetSyncBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={styles.diyanetSyncText}>T.C. Diyanet İşleri Başkanlığı Resmi Takvimiyle Birebir Uyumlu</Text>
                    </View>

                    {/* 2. 6 PRAYER TIME TILES (2x3 Luxury Emerald & Gold Grid) */}
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
                                    {isCurrent && (
                                        <LinearGradient
                                            colors={['rgba(212, 175, 55, 0.22)', 'rgba(6, 78, 59, 0.4)']}
                                            style={StyleSheet.absoluteFillObject}
                                        />
                                    )}

                                    <View style={styles.tileHeaderRow}>
                                        <View style={[styles.tileIconCircle, isCurrent && styles.tileIconCircleActive]}>
                                            <MaterialCommunityIcons
                                                name={item.icon as any}
                                                size={18}
                                                color={isCurrent ? '#FBBF24' : '#6EE7B7'}
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
                                colors={['#08382A', '#042219']}
                                style={styles.quickBtnGradient}
                            >
                                <View style={styles.quickIconCircle}>
                                    <MaterialCommunityIcons name="compass-rose" size={22} color="#D4AF37" />
                                </View>
                                <View style={{ marginLeft: 10, flex: 1 }}>
                                    <Text style={styles.quickBtnTitle}>Kıble Pusulası</Text>
                                    <Text style={styles.quickBtnSub}>Kâbe İstikameti</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="rgba(212, 175, 55, 0.6)" />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickBtn}
                            onPress={() => navigation.navigate('ZikirmatikScreen')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#08382A', '#042219']}
                                style={styles.quickBtnGradient}
                            >
                                <View style={styles.quickIconCircle}>
                                    <MaterialCommunityIcons name="circle-slice-8" size={22} color="#FBBF24" />
                                </View>
                                <View style={{ marginLeft: 10, flex: 1 }}>
                                    <Text style={styles.quickBtnTitle}>Akıllı Zikirmatik</Text>
                                    <Text style={styles.quickBtnSub}>Tesbihat & Zikir</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="rgba(212, 175, 55, 0.6)" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* 4. VAKTE ÖZEL MANEVİ İLHAM & RİSALE-İ NUR KARTI */}
                    <View style={styles.quoteCard}>
                        <View style={styles.quoteCardHeader}>
                            <View style={styles.quoteHeaderTitleGroup}>
                                <Ionicons name="book" size={18} color="#D4AF37" />
                                <Text style={styles.quoteHeaderTitle}>{currentQuote.title}</Text>
                            </View>
                            <View style={styles.quoteActions}>
                                <TouchableOpacity onPress={handleCopy} style={styles.quoteIconBtn}>
                                    <Ionicons
                                        name={copySuccess ? 'checkmark-circle' : 'copy-outline'}
                                        size={17}
                                        color={copySuccess ? '#10B981' : '#D4AF37'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleShare} style={styles.quoteIconBtn}>
                                    <Ionicons name="share-social-outline" size={17} color="#D4AF37" />
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
                                    Âyet-i Kerîme
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.quoteTab, selectedQuoteTab === 'hadis' && styles.quoteTabActive]}
                                onPress={() => setSelectedQuoteTab('hadis')}
                            >
                                <Text style={[styles.quoteTabText, selectedQuoteTab === 'hadis' && styles.quoteTabTextActive]}>
                                    Hadîs-i Şerîf
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

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#041D15',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.25)',
    },
    headerBtnActive: {
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
    },
    headerRightGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: '52%',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.35)',
    },
    locationCityName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#A7F3D0',
        letterSpacing: 0.5,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    dateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        borderRadius: 20,
        paddingVertical: 7,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hijriDateText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#D4AF37',
        marginLeft: 6,
    },
    dateDividerDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(212, 175, 55, 0.4)',
        marginHorizontal: 10,
    },
    gregorianDateText: {
        fontSize: 12,
        color: '#A7F3D0',
    },
    heroCard: {
        borderRadius: 22,
        padding: 20,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(212, 175, 55, 0.35)',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    heroGlowCircle: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.4)',
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
        color: '#A7F3D0',
    },
    nextPrayerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    nextPrayerLabel: {
        fontSize: 11,
        color: '#E2E8F0',
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
        marginBottom: 16,
    },
    timeBox: {
        alignItems: 'center',
        minWidth: 64,
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
        color: '#D4AF37',
        letterSpacing: 1,
        marginTop: -2,
    },
    timeColon: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'rgba(212, 175, 55, 0.6)',
        marginHorizontal: 4,
        marginBottom: 10,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    progressSubText: {
        fontSize: 10,
        color: '#A7F3D0',
    },
    progressPercentText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#D4AF37',
    },
    diyanetSyncBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    diyanetSyncText: {
        fontSize: 11,
        color: '#A7F3D0',
        fontWeight: '500',
    },
    timesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
        marginBottom: 16,
    },
    timeTile: {
        width: (width - 42) / 3,
        backgroundColor: 'rgba(8, 45, 34, 0.75)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        overflow: 'hidden',
    },
    timeTileActive: {
        borderColor: '#F59E0B',
        borderWidth: 2,
        elevation: 6,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
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
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileIconCircleActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    tileArabic: {
        fontSize: 12,
        color: 'rgba(212, 175, 55, 0.6)',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    tileArabicActive: {
        color: '#FDE68A',
        fontWeight: 'bold',
    },
    timeTileName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A7F3D0',
        marginBottom: 2,
    },
    timeTileNameActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    timeTileHour: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
    },
    timeTileHourActive: {
        color: '#FBBF24',
        fontSize: 18,
    },
    currentIndicator: {
        backgroundColor: '#D4AF37',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 6,
    },
    currentIndicatorText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#041D15',
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
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.25)',
    },
    quickBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    quickIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickBtnTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    quickBtnSub: {
        fontSize: 10,
        color: '#A7F3D0',
        marginTop: 1,
    },
    quoteCard: {
        backgroundColor: 'rgba(8, 45, 34, 0.75)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.25)',
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
    },
    quoteHeaderTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#D4AF37',
        marginLeft: 8,
    },
    quoteActions: {
        flexDirection: 'row',
        gap: 8,
    },
    quoteIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quoteTabs: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
        backgroundColor: '#D4AF37',
    },
    quoteTabText: {
        fontSize: 11,
        color: '#A7F3D0',
        fontWeight: '500',
    },
    quoteTabTextActive: {
        color: '#041D15',
        fontWeight: 'bold',
    },
    quoteBody: {
        paddingVertical: 6,
    },
    quoteArabic: {
        fontSize: 18,
        color: '#FDE68A',
        textAlign: 'center',
        lineHeight: 30,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        marginBottom: 8,
    },
    quoteMainText: {
        fontSize: 14,
        color: '#E2E8F0',
        lineHeight: 22,
        textAlign: 'justify',
        fontStyle: 'italic',
    },
    quoteSourceText: {
        fontSize: 12,
        color: '#D4AF37',
        textAlign: 'right',
        marginTop: 8,
        fontWeight: '600',
    },
});
