import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    prayerTimesService,
    PrayerTimes,
    CityInfo,
    ActivePrayerInfo
} from '@/features/prayer/services/prayerTimesService';

export const HomePrayerCard: React.FC = () => {
    const navigation = useNavigation<any>();
    const [times, setTimes] = useState<PrayerTimes | null>(null);
    const [city, setCity] = useState<CityInfo>(prayerTimesService.getSelectedCity());
    const [activeInfo, setActiveInfo] = useState<ActivePrayerInfo | null>(null);
    const [hijriDate, setHijriDate] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const loadTimes = useCallback(async () => {
        try {
            const currentCity = await prayerTimesService.loadSelectedCity();
            setCity(currentCity);
            const now = new Date();
            const prayerTimes = await prayerTimesService.getTimesForDate(now, currentCity);
            setTimes(prayerTimes);
            setActiveInfo(prayerTimesService.getActivePrayerInfo(prayerTimes, now));
            setHijriDate(prayerTimesService.getHijriDate(now, prayerTimes));
        } catch (e) {
            console.warn('[HomePrayerCard] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadTimes();
        }, [loadTimes])
    );

    // Live 1-second ticking countdown
    useEffect(() => {
        if (!times) return;
        const interval = setInterval(() => {
            setActiveInfo(prayerTimesService.getActivePrayerInfo(times, new Date()));
        }, 1000);
        return () => clearInterval(interval);
    }, [times]);

    const formatRemaining = (ms: number) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return { h, m, s };
    };

    if (loading || !times || !activeInfo) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#D4AF37" />
                <Text style={styles.loadingText}>Namaz Vakitleri Yükleniyor...</Text>
            </View>
        );
    }

    const remaining = formatRemaining(activeInfo.remainingMs);

    const PRAYER_LIST = [
        { key: 'imsak', name: 'İmsak', time: times.imsak },
        { key: 'gunes', name: 'Güneş', time: times.gunes },
        { key: 'ogle', name: 'Öğle', time: times.ogle },
        { key: 'ikindi', name: 'İkindi', time: times.ikindi },
        { key: 'aksam', name: 'Akşam', time: times.aksam },
        { key: 'yatsi', name: 'Yatsı', time: times.yatsi },
    ];

    return (
        <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => navigation.navigate('PrayerTimesScreen')}
            style={styles.wrapper}
        >
            <LinearGradient
                colors={['#043b2c', '#032a1f', '#011c15']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Islamic Star Watermark */}
                <View style={styles.watermarkIcon} pointerEvents="none">
                    <MaterialCommunityIcons name="star-four-points" size={120} color="rgba(212, 175, 55, 0.04)" />
                </View>

                {/* 1. Header Row: Location & Diyanet Tag + Hijri Date */}
                <View style={styles.headerRow}>
                    <View style={styles.locationGroup}>
                        <Ionicons name="location-sharp" size={14} color="#D4AF37" />
                        <Text style={styles.cityNameText} numberOfLines={1}>
                            {city.name.split(',')[0]}
                        </Text>
                        <View style={styles.diyanetBadge}>
                            <Text style={styles.diyanetBadgeText}>Diyanet</Text>
                        </View>
                    </View>

                    {hijriDate ? (
                        <View style={styles.hijriGroup}>
                            <Ionicons name="moon" size={11} color="#D4AF37" style={{ marginRight: 4 }} />
                            <Text style={styles.hijriText}>{hijriDate}</Text>
                        </View>
                    ) : null}
                </View>

                {/* 2. Main Countdown Area */}
                <View style={styles.mainArea}>
                    <View style={styles.countdownLeft}>
                        {/* Active Prayer Pill */}
                        <View style={styles.activePill}>
                            <View style={styles.pulsingDot} />
                            <Text style={styles.activePillText}>{activeInfo.currentName} Vakti</Text>
                        </View>

                        <Text style={styles.countdownSubTitle}>
                            {activeInfo.nextName} Vaktine Kalan Süre
                        </Text>

                        {/* Large Luxury Countdown Clock */}
                        <View style={styles.timerDigitsRow}>
                            <Text style={styles.timeDigit}>{remaining.h}</Text>
                            <Text style={styles.timeColon}>:</Text>
                            <Text style={styles.timeDigit}>{remaining.m}</Text>
                            <Text style={styles.timeColon}>:</Text>
                            <Text style={[styles.timeDigit, { color: '#FBBF24' }]}>{remaining.s}</Text>
                        </View>
                    </View>

                    <View style={styles.countdownRight}>
                        <View style={styles.compassCircle}>
                            <MaterialCommunityIcons name="compass-outline" size={26} color="#D4AF37" />
                            <Text style={styles.compassLabel}>Kıble</Text>
                        </View>
                        <View style={styles.openDetailRow}>
                            <Text style={styles.openDetailText}>Detay</Text>
                            <Ionicons name="chevron-forward" size={12} color="#A7F3D0" />
                        </View>
                    </View>
                </View>

                {/* 3. Progress Bar */}
                <View style={styles.progressTrack}>
                    <LinearGradient
                        colors={['#D4AF37', '#FBBF24']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${Math.round(activeInfo.progress * 100)}%` }]}
                    />
                </View>

                {/* 4. 6-Prayer Horizontal Strip */}
                <View style={styles.stripRow}>
                    {PRAYER_LIST.map((item) => {
                        const isCurrent = activeInfo.currentKey === item.key;
                        const isNext = activeInfo.nextKey === item.key;

                        return (
                            <View
                                key={item.key}
                                style={[
                                    styles.stripItem,
                                    isCurrent && styles.stripItemActive,
                                    isNext && styles.stripItemNext
                                ]}
                            >
                                <Text style={[styles.stripName, isCurrent && styles.stripNameActive]}>
                                    {item.name}
                                </Text>
                                <Text style={[styles.stripTime, isCurrent && styles.stripTimeActive]}>
                                    {item.time}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.2,
        borderColor: 'rgba(212, 175, 55, 0.28)',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    cardGradient: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        position: 'relative',
    },
    watermarkIcon: {
        position: 'absolute',
        right: -20,
        top: -15,
    },
    loadingContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#043b2c',
        borderRadius: 20,
        marginBottom: 16,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 13,
        color: '#A7F3D0',
        fontWeight: '500',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    locationGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cityNameText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginLeft: 4,
        marginRight: 6,
    },
    diyanetBadge: {
        backgroundColor: 'rgba(212, 175, 55, 0.18)',
        borderWidth: 0.8,
        borderColor: '#D4AF37',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 6,
    },
    diyanetBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FBBF24',
        letterSpacing: 0.3,
    },
    hijriGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    hijriText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#E2E8F0',
    },
    mainArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    countdownLeft: {
        flex: 1,
    },
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(6, 95, 70, 0.65)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 0.8,
        borderColor: 'rgba(52, 211, 153, 0.4)',
        marginBottom: 4,
    },
    pulsingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    activePillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6EE7B7',
    },
    countdownSubTitle: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
    },
    timerDigitsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 2,
    },
    timeDigit: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        fontVariant: ['tabular-nums'],
        letterSpacing: 1,
    },
    timeColon: {
        fontSize: 22,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 2,
    },
    countdownRight: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    compassCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    compassLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#D4AF37',
        marginTop: 1,
    },
    openDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    openDetailText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#A7F3D0',
        marginRight: 2,
    },
    progressTrack: {
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    stripRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderWidth: 0.8,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    stripItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 2,
        borderRadius: 8,
    },
    stripItemActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.22)',
        borderWidth: 1,
        borderColor: '#D4AF37',
    },
    stripItemNext: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    stripName: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 2,
    },
    stripNameActive: {
        color: '#FDE68A',
        fontWeight: '700',
    },
    stripTime: {
        fontSize: 11,
        fontWeight: '700',
        color: '#E2E8F0',
        fontVariant: ['tabular-nums'],
    },
    stripTimeActive: {
        color: '#FFF',
        fontWeight: '800',
    },
});
