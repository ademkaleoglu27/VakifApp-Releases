import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Reuse types or define locally
type DutyPoolDetailRouteProp = RouteProp<RootStackParamList, 'DutyPoolDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DutyPoolDetailScreen = () => {
    const route = useRoute<DutyPoolDetailRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { poolId, poolName } = route.params;

    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Member Modal State
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMembers = async () => {
        setLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Using a join to get profile info
        const { data, error } = await supabase
            .from('rotation_pool_members')
            .select(`
                *,
                profiles:user_id (id, display_name, phone)
            `)
            .eq('pool_id', poolId)
            .order('sort_order', { ascending: true });

        if (error) {
            Alert.alert('Hata', 'Üye listesi çekilemedi.');
            console.error(error);
        } else {
            setMembers(data || []);
        }
        setLoading(false);
    };

    const fetchAllUsers = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // For the picker
        const { data } = await supabase.from('profiles').select('*').order('display_name');
        if (data) setAllUsers(data);
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    // Reordering Logic
    const moveItem = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === members.length - 1) return;

        const otherIndex = direction === 'up' ? index - 1 : index + 1;
        const currentItem = members[index];
        const otherItem = members[otherIndex];

        // Optimistic UI update
        const newMembers = [...members];
        newMembers[index] = otherItem;
        newMembers[otherIndex] = currentItem;
        setMembers(newMembers);

        // Prepare updates
        // We swap their sort_orders. 
        // Note: Ideally sort_order should be unique and robust, but swapping is fine for small lists.
        const updates = [
            { pool_id: poolId, user_id: currentItem.user_id, sort_order: otherItem.sort_order },
            { pool_id: poolId, user_id: otherItem.user_id, sort_order: currentItem.sort_order }
        ];

        const supabase = getSupabaseClient();
        if (!supabase) return;

        for (const update of updates) {
            const { error } = await supabase
                .from('rotation_pool_members')
                .update({ sort_order: update.sort_order })
                .eq('pool_id', poolId)
                .eq('user_id', update.user_id);
            if (error) console.error("Update failed", error);
        }
    };

    const removeMember = (userId: string, name: string) => {
        Alert.alert(
            'Sil',
            `${name} listeden çıkarılsın mı?`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        const supabase = getSupabaseClient();
                        if (!supabase) return;

                        const { error } = await supabase
                            .from('rotation_pool_members')
                            .delete()
                            .eq('pool_id', poolId)
                            .eq('user_id', userId);

                        if (!error) fetchMembers();
                        else Alert.alert('Hata', 'Silinemedi');
                    }
                }
            ]
        );
    };

    const addMember = async (userId: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const maxSortOrder = members.length > 0 ? Math.max(...members.map(m => m.sort_order)) : 0;

        const { error } = await supabase.from('rotation_pool_members').insert({
            pool_id: poolId,
            user_id: userId,
            sort_order: maxSortOrder + 1
        });

        if (error) {
            Alert.alert('Hata', 'Bu kişi zaten listede olabilir.'); // Unique constraint handles duplicates
        } else {
            setSearchTerm('');
            setAddModalVisible(false);
            fetchMembers();
        }
    };

    const openAddModal = () => {
        fetchAllUsers();
        setAddModalVisible(true);
    };

    const renderMember = ({ item, index }: { item: any, index: number }) => (
        <View style={styles.card}>
            <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.profiles?.display_name || 'İsimsiz'}</Text>
                {item.profiles?.phone && <Text style={styles.phone}>{item.profiles.phone}</Text>}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => moveItem(index, 'up')} disabled={index === 0} style={styles.actionBtn}>
                    <Ionicons name="caret-up" size={24} color={index === 0 ? '#cbd5e1' : '#4f46e5'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveItem(index, 'down')} disabled={index === members.length - 1} style={styles.actionBtn}>
                    <Ionicons name="caret-down" size={24} color={index === members.length - 1 ? '#cbd5e1' : '#4f46e5'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeMember(item.user_id, item.profiles?.display_name)} style={[styles.actionBtn, { marginLeft: 8 }]}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const filteredUsers = allUsers.filter(u =>
        u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !members.some(m => m.user_id === u.id) // Exclude already added
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{poolName}</Text>
                <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={item => item.user_id}
                contentContainerStyle={styles.list}
            />

            {/* Add Member Modal */}
            <Modal visible={isAddModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Kişi Ekle</Text>
                        <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                            <Text style={styles.closeText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İsim ara..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.userItem} onPress={() => addMember(item.id)}>
                                <Text style={styles.userName}>{item.display_name}</Text>
                                <Ionicons name="add-circle-outline" size={24} color="#22c55e" />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#e2e8f0'
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', flex: 1, textAlign: 'center' },
    addBtn: { backgroundColor: '#4f46e5', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    rank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    rankText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    phone: { fontSize: 12, color: '#94a3b8' },
    actions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { padding: 4 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: 'white', padding: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    closeText: { color: '#4f46e5', fontSize: 16 },
    searchInput: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16 },
    userItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
    userName: { fontSize: 16 }
});
