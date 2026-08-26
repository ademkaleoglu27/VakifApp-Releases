import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Alert, ActivityIndicator, DeviceEventEmitter, Platform, ScrollView
} from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { exportToExcel } from '@/utils/excelExport';
import { useAuthStore } from '@/store/authStore';
import { getDb } from '@/services/db/sqlite';
import { LinearGradient } from 'expo-linear-gradient';

type TabType = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface ReadingRecord {
    id: string;
    book_id: string;
    book_title?: string;
    pages_read: number;
    date: string;
    created_at?: string;
}

interface BookStat {
    bookId: string;
    title: string;
    pages: number;
    percentage: number;
}

export const ReadingTrackingScreen = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('WEEKLY');
    const [records, setRecords] = useState<ReadingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadUserReadings();

            const subscription = DeviceEventEmitter.addListener('READING_LOG_ADDED', () => {
                loadUserReadings();
            });

            return () => {
                subscription.remove();
            };
        }, [])
    );

    const loadUserReadings = async () => {
        try {
            setLoading(true);
            const db = await getDb();
            const userId = user?.id;

            let query = 'SELECT * FROM reading_logs';
            let params: any[] = [];

            if (userId) {
                query += ' WHERE user_id = ?';
                params.push(userId);
            }
            query += ' ORDER BY date DESC, created_at DESC';

            const rawLogs = await db.getAllAsync<any>(query, params);
            
            // Map book titles
            const mapped: ReadingRecord[] = (rawLogs || []).map(log => ({
                id: String(log.id),
                book_id: log.book_id || 'risale',
                book_title: formatBookTitle(log.book_id),
                pages_read: Number(log.pages_read) || 0,
                date: log.date || new Date().toISOString().split('T')[0],
                created_at: log.created_at
            }));

            setRecords(mapped);
        } catch (e) {
            console.warn('[ReadingTrackingScreen] Error loading logs:', e);
        } finally {
            setLoading(false);
        }
    };

    // Filter records by selected period
    const filteredRecords = useMemo(() => {
        const now = new Date();
        return records.filter(r => {
            if (!r.date) return false;
            const logDate = new Date(r.date);
            if (isNaN(logDate.getTime())) return false;

            if (activeTab === 'WEEKLY') {
                const diffTime = Math.abs(now.getTime() - logDate.getTime());
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays <= 7;
            } else if (activeTab === 'MONTHLY') {
                return (
                    logDate.getFullYear() === now.getFullYear() &&
                    logDate.getMonth() === now.getMonth()
                );
            } else {
                // YEARLY
                return logDate.getFullYear() === now.getFullYear();
            }
        });
    }, [records, activeTab]);

    // Aggregate statistics
    const stats = useMemo(() => {
        const totalPages = filteredRecords.reduce((sum, r) => sum + r.pages_read, 0);
        
        // Unique active reading days
        const uniqueDays = new Set(filteredRecords.map(r => r.date)).size;
        
        const periodDays = activeTab === 'WEEKLY' ? 7 : activeTab === 'MONTHLY' ? 30 : 365;
        const dailyAverage = periodDays > 0 ? (totalPages / periodDays).toFixed(1) : '0';

        // Book breakdown
        const bookMap: Record<string, { title: string; pages: number }> = {};
        filteredRecords.forEach(r => {
            const key = r.book_id || 'risale';
            if (!bookMap[key]) {
                bookMap[key] = { title: r.book_title || formatBookTitle(key), pages: 0 };
            }
            bookMap[key].pages += r.pages_read;
        });

        const bookStats: BookStat[] = Object.entries(bookMap).map(([bookId, data]) => ({
            bookId,
            title: data.title,
            pages: data.pages,
            percentage: totalPages > 0 ? Math.round((data.pages / totalPages) * 100) : 0,
        })).sort((a, b) => b.pages - a.pages);

        return {
            totalPages,
            uniqueDays,
            dailyAverage,
            bookStats,
        };
    }, [filteredRecords, activeTab]);

    // Export to Excel
    const handleExport = async () => {
        if (filteredRecords.length === 0) {
            Alert.alert('Bilgi', 'Dışa aktarılacak okuma kaydı bulunamadı.');
            return;
        }

        setIsExporting(true);
        try {
            const rangeLabels = {
                WEEKLY: 'Haftalik',
                MONTHLY: 'Aylik',
                YEARLY: 'Yillik'
            };
            const fileName = `Kisisel_Okuma_Raporu_${rangeLabels[activeTab]}_${new Date().toISOString().split('T')[0]}`;

            const exportData = filteredRecords.map((r, index) => ({
                'No': index + 1,
                'Tarih': r.date,
                'Kitap / Eser': r.book_title || r.book_id,
                'Okunan Sayfa': r.pages_read,
            }));

            // Add summary row at the end
            exportData.push({
                'No': '' as any,
                'Tarih': 'TOPLAM',
                'Kitap / Eser': `${stats.bookStats.length} Farklı Eser`,
                'Okunan Sayfa': stats.totalPages,
            });

            await exportToExcel(exportData, fileName, 'Okuma Raporum');
        } catch (e) {
            Alert.alert('Hata', 'Excel dosyası oluşturulurken bir hata oluştu.');
        } finally {
            setIsExporting(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContent}>
            {/* Period Tabs */}
            <View style={styles.tabRow}>
                {(['WEEKLY', 'MONTHLY', 'YEARLY'] as TabType[]).map(tab => {
                    const labels: Record<TabType, string> = {
                        WEEKLY: 'Haftalık',
                        MONTHLY: 'Aylık',
                        YEARLY: 'Yıllık',
                    };
                    const isActive = activeTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {labels[tab]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Main Stats Hero Card */}
            <LinearGradient
                colors={['#064E3B', '#047857']}
                style={styles.heroCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.heroTop}>
                    <View>
                        <Text style={styles.heroGreeting}>
                            {user?.name ? `${user.name} • Okuma Raporu` : 'Kişisel Okuma Raporum'}
                        </Text>
                        <Text style={styles.heroPeriodLabel}>
                            {activeTab === 'WEEKLY' ? 'Son 7 Günlük Toplam' : activeTab === 'MONTHLY' ? 'Bu Ayın Toplamı' : 'Bu Yılın Toplamı'}
                        </Text>
                    </View>
                    <View style={styles.heroBadge}>
                        <Ionicons name="sparkles" size={16} color="#FFD700" />
                    </View>
                </View>

                <View style={styles.heroNumberRow}>
                    <Text style={styles.heroBigNumber}>{stats.totalPages}</Text>
                    <Text style={styles.heroUnit}>Sayfa</Text>
                </View>

                <View style={styles.heroFooterRow}>
                    <View style={styles.heroMetric}>
                        <Text style={styles.heroMetricLabel}>Günlük Ortalama</Text>
                        <Text style={styles.heroMetricValue}>{stats.dailyAverage} s/gün</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroMetric}>
                        <Text style={styles.heroMetricLabel}>Aktif Okunan Gün</Text>
                        <Text style={styles.heroMetricValue}>{stats.uniqueDays} Gün</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Book Distribution Card */}
            {stats.bookStats.length > 0 && (
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="pie-chart-outline" size={18} color="#047857" />
                        <Text style={styles.sectionCardTitle}>Eser Bazlı Dağılım</Text>
                    </View>
                    {stats.bookStats.map(book => (
                        <View key={book.bookId} style={styles.bookRow}>
                            <View style={styles.bookInfoRow}>
                                <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                                <Text style={styles.bookPages}>{book.pages} Sayfa (%{book.percentage})</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${book.percentage}%` }]} />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* History Section Title */}
            <View style={styles.historyTitleRow}>
                <Text style={styles.historySectionTitle}>Okuma Geçmişi ({filteredRecords.length} Kayıt)</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: ReadingRecord }) => (
        <View style={styles.logCard}>
            <View style={styles.logIconCircle}>
                <Ionicons name="book" size={18} color="#047857" />
            </View>
            <View style={styles.logInfo}>
                <Text style={styles.logBookTitle}>{item.book_title}</Text>
                <Text style={styles.logDate}>{item.date}</Text>
            </View>
            <View style={styles.logBadge}>
                <Text style={styles.logPages}>+{item.pages_read} Sayfa</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Okuma Takibi & İstatistikler"
                backButton={false}
                rightElement={
                    <TouchableOpacity
                        style={styles.exportBtn}
                        onPress={handleExport}
                        disabled={isExporting || filteredRecords.length === 0}
                        activeOpacity={0.7}
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color="#047857" />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={16} color="#047857" />
                                <Text style={styles.exportText}>Excel'e İndir</Text>
                            </>
                        )}
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#047857" />
                    <Text style={styles.loadingText}>Okuma verileri yükleniyor...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredRecords}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
                            <Text style={styles.emptyText}>Bu dönemde henüz okuma kaydı bulunmuyor.</Text>
                            <Text style={styles.emptySubtext}>Kütüphaneden kitap okuyarak veya 'Okuma Ekle' menüsünden kayıt girebilirsiniz.</Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

// Helper: Format friendly book title
function formatBookTitle(id: string): string {
    const map: Record<string, string> = {
        'sozler': 'Sözler',
        'mektubat': 'Mektubat',
        'lemalar': 'Lem’alar',
        'sualar': 'Şualar',
        'tarihce': 'Tarihçe-i Hayat',
        'mesnevi': 'Mesnevî-i Nuriye',
        'isarat': 'İşârâtü’l-İ’caz',
        'sikke': 'Sikke-i Tasdik-i Gaybî',
        'barla': 'Barla Lahikası',
        'kastamonu': 'Kastamonu Lahikası',
        'emirdag': 'Emirdağ Lahikası',
        'asa': 'Asâ-yı Mûsâ',
        'quran': 'Kur’an-ı Kerim',
        'cevsen': 'Cevşen-i Kebir',
        'tesbihat': 'Namaz Tesbihatı',
    };
    return map[id.toLowerCase()] || id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    exportText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#047857',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerContent: {
        paddingTop: 12,
        marginBottom: 8,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#047857',
        fontWeight: '700',
    },
    heroCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 14,
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    heroGreeting: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A7F3D0',
    },
    heroPeriodLabel: {
        fontSize: 11,
        color: '#E6FFFA',
        marginTop: 2,
    },
    heroBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginVertical: 6,
    },
    heroBigNumber: {
        fontSize: 44,
        fontWeight: '900',
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    heroUnit: {
        fontSize: 18,
        fontWeight: '600',
        color: '#D1FAE5',
    },
    heroFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: 10,
    },
    heroMetric: {
        flex: 1,
        alignItems: 'center',
    },
    heroMetricLabel: {
        fontSize: 10,
        color: '#A7F3D0',
        fontWeight: '500',
        marginBottom: 2,
    },
    heroMetricValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    heroDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    bookRow: {
        marginBottom: 12,
    },
    bookInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    bookTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        flex: 1,
    },
    bookPages: {
        fontSize: 12,
        fontWeight: '600',
        color: '#047857',
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E2E8F0',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#047857',
        borderRadius: 3,
    },
    historyTitleRow: {
        marginBottom: 10,
    },
    historySectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
    },
    logCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    logIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logInfo: {
        flex: 1,
    },
    logBookTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2,
    },
    logDate: {
        fontSize: 11,
        color: '#94A3B8',
    },
    logBadge: {
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    logPages: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803D',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 12,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 18,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        color: '#64748B',
    },
});
