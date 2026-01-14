import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, StatusBar, Platform } from 'react-native';
import { getSupabaseClient } from '@/services/supabaseClient';
import { DutyAssignment } from '@/types/duty';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';

export const DutyDashboardScreen = () => {
    const [myDuties, setMyDuties] = useState<DutyAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const fetchDuties = async () => {
        setLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) {
            setLoading(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('duty_assignments')
            .select(`
                *,
                rotation_pools (
                    name,
                    duty_types (name)
                )
            `)
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (data) setMyDuties(data as any);
        setLoading(false);
    };

    useEffect(() => {
        fetchDuties();
    }, []);

    const handleAction = async (id: string, action: 'ACCEPT' | 'PASS') => {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase unavailable');

            const { data, error } = await supabase.functions.invoke('respond_assignment', {
                body: { assignment_id: id, action }
            });

            if (error) throw error;

            Alert.alert('İşlem Başarılı', action === 'ACCEPT' ? 'Görev kabul edildi.' : 'Görev pas geçildi.');
            fetchDuties();
        } catch (e: any) {
            Alert.alert('Hata', e.message || 'Bir sorun oluştu.');
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Görevi Sil',
            'Bu görevi silmek istediğinize emin misiniz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const supabase = getSupabaseClient();
                            if (!supabase) return;

                            const { error } = await supabase.from('duty_assignments').delete().eq('id', id);
                            if (error) throw error;
                            Alert.alert('Başarılı', 'Görev silindi.');
                            fetchDuties();
                        } catch (e: any) {
                            Alert.alert('Hata', 'Silme işlemi başarısız: ' + e.message);
                        }
                    }
                }
            ]
        );
    };

    const renderCard = ({ item }: { item: DutyAssignment }) => {
        const poolName = (item.rotation_pools as any)?.name || 'Görev';
        const isPending = item.status === 'PENDING';

        return (
            <View style={[styles.card, isPending && styles.pendingCard]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.poolName}>{poolName}</Text>
                    <View style={[styles.badge, styles[item.status]]}>
                        <Text style={styles.badgeText}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.date}>
                        {format(new Date(item.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                    </Text>
                </View>

                {isPending && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnDecline]}
                            onPress={() => handleAction(item.id, 'PASS')}
                        >
                            <Text style={styles.btnTextDecline}>Pas Geç</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnAccept]}
                            onPress={() => handleAction(item.id, 'ACCEPT')}
                        >
                            <Text style={styles.btnTextAccept}>Kabul Et</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.deleteBtnText}>Görevi Sil</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header Content */}
            <PremiumHeader
                title="Nöbet & Görevlerim"
                backButton={true} // Using backButton slot for menu icon customization
                iconName="menu"
                onBackPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            />

            {/* Main Content */}
            <View style={styles.contentContainer}>
                <FlatList
                    data={myDuties}
                    renderItem={renderCard}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.list}
                    onRefresh={fetchDuties}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="happy-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.empty}>Atanmış görev bulunmuyor.</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
};

const styles: any = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    headerBackground: {
        height: '35%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: theme.colors.primary,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.5 }],
    },
    headerArea: {
        paddingHorizontal: 24,
        marginBottom: 20,
        zIndex: 10
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },

    contentContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    list: { padding: 24, paddingBottom: 100 },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    pendingCard: {
        borderColor: '#f59e0b',
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
        backgroundColor: '#fffbeb',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    poolName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },

    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    date: { fontSize: 14, color: '#64748b', fontWeight: '500' },

    actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnAccept: { backgroundColor: '#22c55e' },
    btnDecline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
    btnTextAccept: { color: 'white', fontWeight: 'bold' },
    btnTextDecline: { color: '#64748b', fontWeight: 'bold' },

    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: 'white' },
    PENDING: { backgroundColor: '#f59e0b' },
    CONFIRMED: { backgroundColor: '#22c55e' },
    DECLINED: { backgroundColor: '#ef4444' },
    EXPIRED: { backgroundColor: '#64748b' },

    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
    empty: { textAlign: 'center', color: '#94a3b8', fontSize: 16 },

    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, marginTop: 4 },
    deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' }
});
