import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

type TabType = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALERTS';

export const ReadingTrackingScreen = () => {
    const [activeTab, setActiveTab] = useState<TabType>('WEEKLY');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [activeTab])
    );

    const loadData = async () => {
        setLoading(true);
        setData([]); // Clear old data to prevent flashing
        try {
            let result = [];
            if (activeTab === 'WEEKLY') {
                result = await RisaleUserDb.getReadingStats('weekly');
            } else if (activeTab === 'MONTHLY') {
                result = await RisaleUserDb.getReadingStats('monthly');
            } else if (activeTab === 'YEARLY') {
                result = await RisaleUserDb.getReadingStats('yearly');
            } else {
                result = await RisaleUserDb.getInactiveUsers(21); // 3 weeks
            }
            setData(result || []);
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Veriler yüklenemedi.');
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

    const renderItem = ({ item }: { item: any }) => {
        const nameInitial = item.name ? item.name[0] : '?';
        const surnameInitial = item.surname ? item.surname[0] : '';
        const displayName = `${item.name || ''} ${item.surname || ''}`.trim() || 'İsimsiz';

        return (
            <View style={styles.card}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{nameInitial}{surnameInitial}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={styles.name}>{displayName}</Text>
                    {activeTab !== 'ALERTS' ? (
                        <Text style={styles.stats}>{item.total_pages || 0} Sayfa</Text>
                    ) : (
                        <Text style={styles.alertText}>
                            {(() => {
                                if (!item.last_reading_date) return 'Hiç okuma kaydı yok';

                                const now = new Date();
                                const last = new Date(item.last_reading_date);
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
                    {item.phone && (
                        <>
                            <TouchableOpacity onPress={() => handleCall(item.phone)} style={[styles.actionBtn, styles.callBtn]}>
                                <Ionicons name="call" size={18} color="#0284C7" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleWhatsApp(item.phone)} style={[styles.actionBtn, styles.whatsappBtn]}>
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
                    style={[styles.tab, activeTab === 'ALERTS' && styles.activeTabAlert]}
                    onPress={() => setActiveTab('ALERTS')}
                >
                    <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.activeTabAlertText]}>İlgilen!</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
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
    }
});
