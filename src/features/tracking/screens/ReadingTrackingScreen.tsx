import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Alert, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { exportToExcel } from '@/utils/excelExport';
import { ReadingStatsService, FetchMode, StatsRange } from '@/services/ReadingStatsService';

type TabType = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const ReadingTrackingScreen = () => {
    const [activeTab, setActiveTab] = useState<TabType>('WEEKLY');
    const [isAlertsMode, setIsAlertsMode] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadData();

            // Refresh data when a new reading log is added anywhere in the app
            const subscription = DeviceEventEmitter.addListener('READING_LOG_ADDED', () => {
                loadData();
            });

            return () => {
                subscription.remove();
            };
        }, [activeTab, isAlertsMode])
    );

    const loadData = async () => {
        setLoading(true);
        setData([]);
        setError(null);
        try {
            // ✅ require() kaldırıldı, direkt import kullanılıyor
            const mode: FetchMode = isAlertsMode ? 'needsAttention' : 'full';
            const rangeMap: Record<TabType, StatsRange> = {
                'WEEKLY': 'week',
                'MONTHLY': 'month',
                'YEARLY': 'year',
            };
            const range = rangeMap[activeTab];
            const result = await ReadingStatsService.fetchLeaderboard(range, mode);
            console.log('[Screen] Leaderboard geldi:', result?.length, 'kayıt');
            setData(result || []);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };


    const handleCall = (phone: string) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`);
    };

    const handleWhatsApp = (phone: string) => {
        if (!phone) return;
        Linking.openURL(`whatsapp://send?phone=${phone}`);
    };

    const handleExport = async () => {
        if (data.length === 0) {
            Alert.alert("Bilgi", "Dışa aktarılacak veri bulunamadı.");
            return;
        }

        setIsExporting(true);
        try {
            const rangeMap: Record<string, string> = {
                'WEEKLY': 'Haftalik',
                'MONTHLY': 'Aylik',
                'YEARLY': 'Yillik'
            };
            const fileName = `Okuma_Takibi_${rangeMap[activeTab]}${isAlertsMode ? '_Ilgilen' : ''}_${new Date().toISOString().split('T')[0]}`;

            const exportData = data.map(item => {
                const displayName = item.display_name || item.displayName || 'İsimsiz';
                const totalPages = item.total_pages || item.totalPages || 0;
                const lastReadingDate = item.last_reading_date || item.lastReadingDate;
                const lastDateObj = lastReadingDate ? new Date(lastReadingDate) : null;
                const isValidDate = lastDateObj && !isNaN(lastDateObj.getTime());
                const formattedDate = isValidDate ? `${lastDateObj.getDate()}.${lastDateObj.getMonth() + 1}.${lastDateObj.getFullYear()}` : 'Hiç okumadı';

                if (isAlertsMode) {
                    return {
                        'Kişi Adı': displayName,
                        'Durum': 'Bu dönemde okuma girmedi',
                        'Son Okuma Tarihi': formattedDate,
                        'Telefon': item.phone || ''
                    };
                }

                return {
                    'Kişi Adı': displayName,
                    'Okuma Sayısı (Sayfa)': totalPages,
                    'Son Okuma Tarihi': formattedDate,
                    'Telefon': item.phone || ''
                };
            });

            await exportToExcel(exportData, fileName, 'Okuma Verileri');
        } catch (error) {
            Alert.alert("Hata", "Excel'e aktarım sırasında bir hata oluştu.");
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        if (!item) return null;

        // Support both snake_case (from RPC) and camelCase (legacy) field names
        const displayName = item.display_name || item.displayName || 'İsimsiz';
        const initials = item.initials || displayName?.[0] || '?';
        const totalPages = item.total_pages || item.totalPages || 0;
        const lastReadingDate = item.last_reading_date || item.lastReadingDate;
        const phone = item.phone || '';

        return (
            <View style={styles.card}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={styles.name}>{displayName}</Text>
                    {!isAlertsMode ? (
                        <Text style={styles.stats}>{totalPages} Sayfa</Text>
                    ) : (
                        <Text style={styles.alertText}>
                            {(() => {
                                if (!lastReadingDate) return 'Hiç okuma kaydı yok';

                                const now = new Date();
                                const last = new Date(lastReadingDate);
                                const diffTime = Math.abs(now.getTime() - last.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                if (diffDays < 7) return `${diffDays} gün önce okudu`;
                                if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce okudu`;
                                if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce okudu`;
                                return '1 yıldan uzun süredir okumadı';
                            })()}
                        </Text>
                    )}
                </View>

                <View style={styles.actions}>
                    {phone && (
                        <>
                            <TouchableOpacity onPress={() => handleCall(phone)} style={[styles.actionBtn, styles.callBtn]}>
                                <Ionicons name="call" size={18} color="#0284C7" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleWhatsApp(phone)} style={[styles.actionBtn, styles.whatsappBtn]}>
                                <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Okuma Takibi" backButton={false} />

            <View style={styles.headerActions}>
                <Text style={styles.sectionTitle}>Liste Görünümü</Text>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={isExporting || data.length === 0}>
                    {isExporting ? <ActivityIndicator size="small" color="#0284C7" /> : <Ionicons name="download-outline" size={18} color="#0284C7" />}
                    <Text style={styles.exportBtnText}>Excel'e Aktar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'WEEKLY' && styles.activeTab]}
                    onPress={() => setActiveTab('WEEKLY')}
                >
                    <Text style={[styles.tabText, activeTab === 'WEEKLY' && styles.activeTabText]}>Haftalık</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'MONTHLY' && styles.activeTab]}
                    onPress={() => setActiveTab('MONTHLY')}
                >
                    <Text style={[styles.tabText, activeTab === 'MONTHLY' && styles.activeTabText]}>Aylık</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'YEARLY' && styles.activeTab]}
                    onPress={() => setActiveTab('YEARLY')}
                >
                    <Text style={[styles.tabText, activeTab === 'YEARLY' && styles.activeTabText]}>Yıllık</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, isAlertsMode && styles.activeTabAlert]}
                    onPress={() => setIsAlertsMode(!isAlertsMode)}
                >
                    <Text style={[styles.tabText, isAlertsMode ? styles.activeTabAlertText : { color: '#EF4444' }]}>İlgilen!</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 12, color: '#64748B' }}>Yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="warning-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                        <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item?.user_id || item?.id?.toString() || `item-${index}`}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="documents-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0F2FE',
        gap: 6,
    },
    exportBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0284C7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeTab: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    activeTabAlert: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    activeTabText: {
        color: '#fff',
    },
    activeTabAlertText: {
        color: '#fff',
    },
    list: {
        padding: 16,
        paddingTop: 0,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    stats: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    alertText: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callBtn: {
        backgroundColor: '#E0F2FE',
    },
    whatsappBtn: {
        backgroundColor: '#DCFCE7',
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 12,
        color: '#94A3B8',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
