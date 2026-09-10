import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { lastReadService, LastReadItem } from '@/services/lastReadService';
import { theme } from '@/config/theme';

export const ContinueReadingCard: React.FC = () => {
    const navigation = useNavigation<any>();
    const [lastRead, setLastRead] = useState<LastReadItem | null>(null);

    useEffect(() => {
        const unsubscribe = lastReadService.subscribe((item) => {
            if (item) {
                setLastRead(item);
            }
        });

        const loadInitialItem = async () => {
            const active = await lastReadService.getLastRead();
            if (active) {
                setLastRead(active);
                return;
            }

            try {
                const savedBm = await AsyncStorage.getItem('@risale_global_last_bookmark');
                if (savedBm) {
                    const bm = JSON.parse(savedBm);
                    setLastRead({
                        id: `risale_${bm.bookId}`,
                        type: 'risale',
                        title: bm.title || 'Risale-i Nur',
                        subtitle: `${bm.chapterTitle || ''}${bm.targetPage ? ` • Sayfa ${bm.targetPage}` : ''}`,
                        screenName: 'RisaleHtmlReader',
                        params: {
                            assetPath: bm.assetPath,
                            title: bm.chapterTitle || bm.title,
                            bookId: bm.bookId,
                            chapterId: bm.chapterId,
                            targetPage: bm.targetPage,
                            scrollRatio: bm.scrollRatio,
                        },
                        timestamp: bm.date ? new Date(bm.date).getTime() : Date.now(),
                        icon: 'library-outline'
                    });
                }
            } catch {}
        };

        loadInitialItem();

        return () => unsubscribe();
    }, []);

    const handleContinue = async () => {
        if (lastRead) {
            navigation.navigate(lastRead.screenName, lastRead.params);
            return;
        }

        try {
            const savedBm = await AsyncStorage.getItem('@risale_global_last_bookmark');
            if (savedBm) {
                const bm = JSON.parse(savedBm);
                if (bm.assetPath) {
                    navigation.navigate('RisaleHtmlReader', {
                        assetPath: bm.assetPath,
                        title: bm.chapterTitle || bm.title,
                        bookId: bm.bookId,
                        chapterId: bm.chapterId,
                        targetPage: bm.targetPage,
                        scrollRatio: bm.scrollRatio,
                    });
                    return;
                }
            }
        } catch {}

        // Default fallback: open Quran Page 1
        navigation.navigate('QuranReaderScreen', { initialPage: 1 });
    };

    const getRelativeTime = (timestamp: number) => {
        const diffMs = Date.now() - timestamp;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        return `${diffDays} gün önce`;
    };

    const getIconName = (type?: string) => {
        switch (type) {
            case 'quran_page':
            case 'quran_text':
                return 'book-outline';
            case 'risale':
                return 'library-outline';
            case 'cevsen':
                return 'shield-checkmark-outline';
            case 'elifba':
                return 'school-outline';
            default:
                return 'bookmark-outline';
        }
    };

    const isRisale = lastRead?.type === 'risale';
    const title = lastRead?.title || "Kur'an-ı Kerim";
    const subtitle = lastRead?.subtitle || '1. Cüz • Fâtiha Suresi';
    const relativeTime = lastRead ? getRelativeTime(lastRead.timestamp) : 'Hemen Başlayın';

    return (
        <TouchableOpacity
            style={[styles.card, isRisale && styles.cardRisale]}
            onPress={handleContinue}
            activeOpacity={0.85}
        >
            <View style={styles.topRow}>
                <View style={[styles.badge, isRisale && styles.badgeRisale]}>
                    <Ionicons
                        name={isRisale ? "library" : "bookmark"}
                        size={12}
                        color={isRisale ? "#92400E" : "#B45309"}
                    />
                    <Text style={[styles.badgeText, isRisale && styles.badgeTextRisale]}>
                        {isRisale ? 'RİSALE-İ NUR • KALDIĞINIZ YER' : 'KALDIĞINIZ YERDEN DEVAM EDİN'}
                    </Text>
                </View>
                <Text style={styles.timeText}>{relativeTime}</Text>
            </View>

            <View style={styles.contentRow}>
                <View style={[styles.iconCircle, isRisale && styles.iconCircleRisale]}>
                    <Ionicons
                        name={getIconName(lastRead?.type) as any}
                        size={22}
                        color={isRisale ? '#B45309' : theme.colors.primary}
                    />
                </View>
                <View style={styles.textGroup}>
                    <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                    <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>
                </View>
                <View style={[styles.continueBtn, isRisale && styles.continueBtnRisale]}>
                    <Text style={styles.continueBtnText}>Devam Et</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: '#E8D5A3',
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    cardRisale: {
        borderColor: '#FDE68A',
        backgroundColor: '#FFFDF9',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeRisale: {
        backgroundColor: '#FEF3C7',
        borderWidth: 0.5,
        borderColor: '#FCD34D',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#92400E',
        letterSpacing: 0.5,
    },
    badgeTextRisale: {
        color: '#78350F',
    },
    timeText: {
        fontSize: 11,
        color: '#78716C',
        fontWeight: '500',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    iconCircleRisale: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
    },
    textGroup: {
        flex: 1,
    },
    titleText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1C1917',
    },
    subtitleText: {
        fontSize: 12,
        color: '#78716C',
        marginTop: 2,
    },
    continueBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    continueBtnRisale: {
        backgroundColor: '#B45309',
    },
    continueBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});
