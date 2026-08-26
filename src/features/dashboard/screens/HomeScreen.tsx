import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Platform, Share
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { LinearGradient } from 'expo-linear-gradient';
import { ContinueReadingCard } from '@/components/ContinueReadingCard';
import { getDb } from '@/services/db/sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HomeScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();

    const [dailyQuote, setDailyQuote] = useState<{ text: string, source: string } | null>(null);
    const [weeklyPages, setWeeklyPages] = useState<number>(0);
    const weeklyGoal = 50; // 50 pages weekly goal

    const openDrawer = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    useFocusEffect(
        useCallback(() => {
            loadWeeklyStats();
        }, [user])
    );

    const loadWeeklyStats = async () => {
        try {
            const db = await getDb();
            const now = new Date();
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const dateStr = lastWeek.toISOString().split('T')[0];

            let query = 'SELECT SUM(pages_read) as total FROM reading_logs WHERE date >= ?';
            let params: any[] = [dateStr];

            if (user?.id) {
                query += ' AND user_id = ?';
                params.push(user.id);
            }

            const res = await db.getFirstAsync<{ total: number }>(query, params);
            setWeeklyPages(res?.total || 0);
        } catch (e) {
            console.warn('[HomeScreen] Error loading weekly stats:', e);
        }
    };

    useEffect(() => {
        const fetchQuote = async () => {
            const quote = await RisaleUserDb.getTodayQuote();
            if (quote) {
                setDailyQuote(quote);
            }
        };
        fetchQuote();
    }, []);

    const displayName = (user as any)?.user_metadata?.full_name
        || user?.name
        || (user?.email ? user.email.split('@')[0] : 'Kıymetli Kardeşimiz');

    const handleShareVerse = async () => {
        try {
            await Share.share({
                message: `✨ GÜNÜN AYETİ\n\n"Şüphesiz kalpler ancak Allah'ı anmakla huzur bulur." (Ra'd Sûresi, 28)\n\n— Nur Mektebi İbadet & Okuma Rehberi`
            });
        } catch (e) {}
    };

    const progressPercentage = Math.min(Math.round((weeklyPages / weeklyGoal) * 100), 100);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Islamic Gradient Header Background with Geometric Accents */}
            <View style={styles.headerBackground} pointerEvents="none">
                <LinearGradient
                    colors={['#044e3b', '#065f46', '#0f766e']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.islamicStarWatermark}>
                    <MaterialCommunityIcons name="star-four-points" size={140} color="rgba(255,255,255,0.04)" />
                </View>
                <View style={styles.decorativeCircle} />
            </View>

            {/* Top User Bar */}
            <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 38) }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={openDrawer}
                        style={styles.menuButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="menu" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeGreeting}>Hayırlı Günler,</Text>
                        <Text style={styles.userNameText} numberOfLines={1}>{displayName}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={() => navigation.navigate('PrayerTimesScreen')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="compass-outline" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Scrollable Spiritual Content Card */}
            <ScrollView
                style={styles.mainScroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Daily Risale Quote with Islamic Border */}
                <View style={styles.quoteCard}>
                    <View style={styles.quoteIconCircle}>
                        <Ionicons name="chatbox-ellipses" size={20} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.quoteText} numberOfLines={3}>
                            "{dailyQuote?.text || 'Güzel gören güzel düşünür. Güzel düşünen, hayatından lezzet alır.'}"
                        </Text>
                        <Text style={styles.quoteSource}>— {dailyQuote?.source || 'Mektubat'}</Text>
                    </View>
                </View>

                {/* 2. Last Read Resumption Card */}
                <ContinueReadingCard />

                {/* 3. Quick Access 3-Pill Grid */}
                <View style={styles.quickCardsRow}>
                    <TouchableOpacity
                        style={[styles.quickCardItem, styles.quickCardQuran]}
                        onPress={() => navigation.navigate('QuranTextMenuScreen')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.quranIconCircle}>
                            <Ionicons name="book" size={20} color="#047857" />
                        </View>
                        <Text style={[styles.quickCardTitle, { color: '#047857' }]} numberOfLines={1}>Kur'an</Text>
                        <Text style={[styles.quickCardSubtitle, { color: '#065F46' }]} numberOfLines={1}>Hat & Meal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickCardItem, styles.quickCardPrayer]}
                        onPress={() => navigation.navigate('PrayerTimesScreen')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.prayerIconCircle}>
                            <Ionicons name="time" size={20} color="#064E3B" />
                        </View>
                        <Text style={styles.quickCardTitle} numberOfLines={1}>Namaz</Text>
                        <Text style={styles.quickCardSubtitle} numberOfLines={1}>Ezan & Kıble</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickCardItem, styles.quickCardZikir]}
                        onPress={() => navigation.navigate('ZikirmatikScreen')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.zikirIconCircle}>
                            <MaterialCommunityIcons name="circle-slice-8" size={20} color="#B45309" />
                        </View>
                        <Text style={[styles.quickCardTitle, { color: '#78350F' }]} numberOfLines={1}>Zikirmatik</Text>
                        <Text style={[styles.quickCardSubtitle, { color: '#92400E' }]} numberOfLines={1}>Evrad & Tesbih</Text>
                    </TouchableOpacity>
                </View>

                {/* 4. Personal Weekly Reading Goal & Progress Card */}
                <LinearGradient
                    colors={['#FFFDF8', '#FEF9EE']}
                    style={styles.goalCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.goalTopRow}>
                        <View style={styles.goalHeaderLeft}>
                            <View style={styles.goalIconCircle}>
                                <Ionicons name="ribbon-outline" size={20} color="#D97706" />
                            </View>
                            <View>
                                <Text style={styles.goalCardTitle}>Haftalık Okuma Hedefim</Text>
                                <Text style={styles.goalCardSubtitle}>Son 7 günlük kişisel takibiniz</Text>
                            </View>
                        </View>
                        <View style={styles.goalBadge}>
                            <Text style={styles.goalBadgeText}>%{progressPercentage}</Text>
                        </View>
                    </View>

                    <View style={styles.goalNumberRow}>
                        <Text style={styles.goalBigNumber}>{weeklyPages}</Text>
                        <Text style={styles.goalUnitText}>/ {weeklyGoal} Sayfa</Text>
                        <Text style={styles.goalRemainingText}>
                            {weeklyPages >= weeklyGoal ? '🎉 Hedef Tamamlandı!' : `${weeklyGoal - weeklyPages} sayfa kaldı`}
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarBg}>
                        <LinearGradient
                            colors={['#10B981', '#047857']}
                            style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>

                    {/* Quick Add Reading Button */}
                    <View style={styles.goalActionRow}>
                        <TouchableOpacity
                            style={styles.goalActionBtn}
                            onPress={() => navigation.navigate('ReadingTracking')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="stats-chart-outline" size={16} color="#047857" />
                            <Text style={styles.goalActionBtnText}>İstatistiklere Git</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.goalAddBtn}
                            onPress={() => navigation.navigate('AddReading')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle" size={16} color="#FFF" />
                            <Text style={styles.goalAddBtnText}>Okuma Ekle</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* 5. Günün Âyet-i Kerîmesi (Islamic Tezhip Ornament Box) */}
                <View style={styles.verseCard}>
                    <View style={styles.verseHeaderRow}>
                        <View style={styles.verseTagBadge}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={14} color="#047857" />
                            <Text style={styles.verseTagText}>GÜNÜN ÂYETİ</Text>
                        </View>
                        <TouchableOpacity onPress={handleShareVerse} activeOpacity={0.7} style={styles.shareIconBtn}>
                            <Ionicons name="share-social-outline" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.verseArabic}>
                        أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
                    </Text>

                    <Text style={styles.verseMeaning}>
                        "Bilesiniz ki, kalpler ancak Allah'ı anmakla huzur ve sükûna kavuşur."
                    </Text>

                    <View style={styles.verseFooter}>
                        <Text style={styles.verseSurah}>— Ra'd Sûresi, 28. Âyet-i Kerîme</Text>
                    </View>
                </View>

                {/* 6. Günün Hadîs-i Şerîfi */}
                <View style={styles.hadithCard}>
                    <View style={styles.hadithHeaderRow}>
                        <View style={styles.hadithTagBadge}>
                            <Ionicons name="sparkles" size={14} color="#B45309" />
                            <Text style={styles.hadithTagText}>GÜNÜN HADİSİ</Text>
                        </View>
                    </View>

                    <Text style={styles.hadithText}>
                        "Kim Kur'an-ı Kerim'den bir harf okursa, onun için bir sevap vardır. Her bir sevabın karşılığı da on mislidir."
                    </Text>

                    <Text style={styles.hadithSource}>— Hadis-i Şerif (Tirmizî, Fedâilü'l-Kur'an, 16)</Text>
                </View>

                {/* Extra Bottom Padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerBackground: {
        height: 260,
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
    },
    islamicStarWatermark: {
        position: 'absolute',
        right: -20,
        top: 30,
        opacity: 0.8,
    },
    decorativeCircle: {
        position: 'absolute',
        top: -80,
        left: -80,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    headerArea: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    menuButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeContainer: {
        flex: 1,
    },
    welcomeGreeting: {
        fontSize: 12,
        color: '#A7F3D0',
        fontWeight: '500',
    },
    userNameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainScroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 40,
    },
    quoteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        gap: 12,
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    quoteIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#047857',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quoteText: {
        fontSize: 12.5,
        color: '#334155',
        fontStyle: 'italic',
        lineHeight: 19,
        fontWeight: '500',
    },
    quoteSource: {
        fontSize: 11,
        color: '#047857',
        fontWeight: 'bold',
        marginTop: 4,
        textAlign: 'right',
    },
    quickCardsRow: {
        flexDirection: 'row',
        gap: 10,
        marginVertical: 14,
    },
    quickCardItem: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECFDF5',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 2,
        borderWidth: 1,
        borderColor: '#A7F3D0',
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickCardQuran: {
        backgroundColor: '#ECFDF5',
        borderColor: '#6EE7B7',
        shadowColor: '#047857',
    },
    quickCardPrayer: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
        shadowColor: '#064E3B',
    },
    quickCardZikir: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        shadowColor: '#B45309',
    },
    quranIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    prayerIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    zikirIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    quickCardTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#064E3B',
        textAlign: 'center',
    },
    quickCardSubtitle: {
        fontSize: 9.5,
        color: '#047857',
        marginTop: 2,
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    goalCard: {
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    goalTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    goalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    goalIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    goalCardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#78350F',
    },
    goalCardSubtitle: {
        fontSize: 11,
        color: '#92400E',
    },
    goalBadge: {
        backgroundColor: '#047857',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    goalBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
    },
    goalNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginVertical: 6,
    },
    goalBigNumber: {
        fontSize: 32,
        fontWeight: '900',
        color: '#78350F',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    goalUnitText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#B45309',
    },
    goalRemainingText: {
        fontSize: 12,
        color: '#047857',
        fontWeight: '600',
        marginLeft: 'auto',
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
        marginVertical: 10,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    goalActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    goalActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#047857',
    },
    goalAddBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#047857',
        paddingVertical: 9,
        borderRadius: 12,
    },
    goalAddBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    verseCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#A7F3D0',
        shadowColor: '#047857',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    verseHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    verseTagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    verseTagText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#047857',
        letterSpacing: 0.5,
    },
    shareIconBtn: {
        padding: 4,
    },
    verseArabic: {
        fontSize: 22,
        color: '#064E3B',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
        lineHeight: 34,
        marginVertical: 8,
    },
    verseMeaning: {
        fontSize: 13,
        color: '#334155',
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
        marginVertical: 4,
    },
    verseFooter: {
        alignItems: 'center',
        marginTop: 8,
    },
    verseSurah: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    hadithCard: {
        backgroundColor: '#FFFDF7',
        borderRadius: 22,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    hadithHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    hadithTagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    hadithTagText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#B45309',
        letterSpacing: 0.5,
    },
    hadithText: {
        fontSize: 12.5,
        color: '#451A03',
        lineHeight: 20,
        fontStyle: 'italic',
        marginVertical: 4,
    },
    hadithSource: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B45309',
        marginTop: 6,
        textAlign: 'right',
    },
});
