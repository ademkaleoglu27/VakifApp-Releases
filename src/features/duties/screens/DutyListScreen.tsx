import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabaseClient';
import { theme } from '@/config/theme';
import { PremiumHeader } from '@/components/PremiumHeader';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DutyListScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    // Create Pool State
    const [pools, setPools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [selectedHour, setSelectedHour] = useState('09');

    // Duty Types
    const [dutyTypes, setDutyTypes] = useState<any[]>([]);
    const [selectedType, setSelectedType] = useState<string>('');

    const fetchPools = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rotation_pools')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true }); // Or order by name

        if (error) console.error(error);
        if (data) setPools(data);
        setLoading(false);
    };

    const fetchTypes = async () => {
        const { data } = await supabase.from('duty_types').select('*');
        if (data) {
            setDutyTypes(data);
            if (data.length > 0) setSelectedType(data[0].id);
        }
    };

    useEffect(() => {
        fetchPools();
        fetchTypes();
    }, []);

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex));
        } else {
            setSelectedDays([...selectedDays, dayIndex]);
        }
    };

    const handleCreate = async () => {
        if (!newName || selectedDays.length === 0 || !selectedType) {
            alert('Lütfen isim ve en az bir gün seçin.');
            return;
        }

        // Construct Cron: "0 [Hour] * * [Days]"
        // Cron days: 0-7 (0=Sun, 1=Mon... 7=Sun)
        // JS days: 0=Sun. Our UI index: 0=Mon, 1=Tue... 6=Sun (We need to map)

        // UI MAPPING (Pzt=1, Sal=2, ... Paz=0)
        // Let's assume toggleDay passes the CORRECT Cron/JS day index directly.
        // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun

        const daysStr = selectedDays.join(',');
        const cron = `0 ${selectedHour} * * ${daysStr}`;

        const { error } = await supabase.from('rotation_pools').insert({
            name: newName,
            duty_type_id: selectedType,
            cron_schedule: cron,
            is_active: true
        });

        if (error) {
            alert('Oluşturulamadı: ' + error.message);
        } else {
            setCreateModalVisible(false);
            setNewName('');
            setSelectedDays([]);
            fetchPools(); // Refresh
        }
    };

    const DAYS = [
        { label: 'Pzt', val: 1 },
        { label: 'Sal', val: 2 },
        { label: 'Çar', val: 3 },
        { label: 'Per', val: 4 },
        { label: 'Cum', val: 5 },
        { label: 'Cmt', val: 6 },
        { label: 'Paz', val: 0 },
    ];

    const handleDeletePool = async (id: string, name: string) => {
        Alert.alert(
            'Grubu Sil',
            `"${name}" grubunu silmek istediğinize emin misiniz? Grubun tüm geçmiş görevleri silinecektir.`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        // Cascade delete manually just in case
                        await supabase.from('duty_assignments').delete().eq('pool_id', id);
                        await supabase.from('rotation_pool_members').delete().eq('pool_id', id);

                        const { error } = await supabase.from('rotation_pools').delete().eq('id', id);

                        if (error) {
                            Alert.alert('Hata', 'Grup silinemedi: ' + error.message);
                        } else {
                            fetchPools();
                        }
                        setLoading(false);
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.cardWrapper}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('DutyPoolDetail', { poolId: item.id, poolName: item.name })}
            >
                <View style={styles.iconContainer}>
                    {/* Icon based on name keywords */}
                    <Ionicons
                        name={item.name.toLowerCase().includes('temizlik') ? 'water' : item.name.toLowerCase().includes('sohbet') ? 'book' : 'cafe'}
                        size={24}
                        color="#4f46e5"
                    />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.subtext}>
                        {item.cron_schedule ? 'Otomatik Planlı' : 'Manuel'}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>

            {/* Delete Action - Only visible if manual or simple admin action */}
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDeletePool(item.id, item.name)}
            >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Nöbet Listeleri"
                backButton
                onBackPress={() => navigation.navigate('DrawerRoot', { screen: 'MainTabs' } as any)}
            >
                <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </PremiumHeader>

            {loading ? (
                <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={pools}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>Tanımlı nöbet grubu bulunamadı.</Text>}
                />
            )}

            {/* CREATE MODAL */}
            <Modal visible={isCreateModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Yeni Grup Oluştur</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                            <Text style={styles.closeText}>İptal</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formItem}>
                        <Text style={styles.label}>Grup Adı</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: Cuma Temizliği"
                            placeholderTextColor="#94a3b8"
                            value={newName}
                            onChangeText={setNewName}
                        />
                    </View>

                    <View style={styles.formItem}>
                        <Text style={styles.label}>Hangi Günler?</Text>
                        <View style={styles.daysRow}>
                            {DAYS.map(day => (
                                <TouchableOpacity
                                    key={day.val}
                                    style={[styles.dayChip, selectedDays.includes(day.val) && styles.dayChipActive]}
                                    onPress={() => toggleDay(day.val)}
                                >
                                    <Text style={[styles.dayText, selectedDays.includes(day.val) && styles.dayTextActive]}>{day.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formItem}>
                        <Text style={styles.label}>Saat (Her sabah bildirim gider)</Text>
                        <View style={styles.daysRow}>
                            {['07', '09', '12', '18', '20', '21'].map(h => (
                                <TouchableOpacity
                                    key={h}
                                    style={[styles.dayChip, selectedHour === h && styles.dayChipActive]}
                                    onPress={() => setSelectedHour(h)}
                                >
                                    <Text style={[styles.dayText, selectedHour === h && styles.dayTextActive]}>{h}:00</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                        <Text style={styles.createBtnText}>Oluştur</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    // header: removed
    // backBtn: removed
    // headerTitle: removed
    addBtn: { backgroundColor: '#fff', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    cardWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden'
    },
    card: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    deleteAction: {
        padding: 16,
        borderLeftWidth: 1,
        borderLeftColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fef2f2' // Light red bg
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    subtext: { fontSize: 13, color: '#64748b' },
    empty: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: 'white', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
    closeText: { fontSize: 16, color: '#64748b' },
    formItem: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 12 },
    input: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    dayChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    dayText: { fontWeight: '600', color: '#64748b' },
    dayTextActive: { color: 'white' },
    createBtn: { backgroundColor: '#22c55e', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    createBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
