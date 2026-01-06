import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabaseClient';
import { theme } from '@/config/theme';
import { PremiumHeader } from '@/components/PremiumHeader';
import { requireFeature } from '@/utils/guard';
import { NoAccess } from '@/components/NoAccess';
import { useAuthStore } from '@/store/authStore';
import * as Contacts from 'expo-contacts';

// Types
type Role = 'mesveret_admin' | 'sohbet_member' | 'accountant';

interface Profile {
    id: string;
    display_name: string;
    phone: string | null;
    role: Role;
    is_active: boolean;
}

export const ContactsScreen = () => {
    if (!requireFeature('MESVERET_SCREEN')) return <NoAccess />;

    const { user } = useAuthStore();
    const isAdmin = user?.role === 'mesveret_admin';

    const [activeTab, setActiveTab] = useState<Role>('mesveret_admin');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRole, setEditRole] = useState<Role>('sohbet_member');

    // Contact Picker Modal
    const [isContactPickerVisible, setContactPickerVisible] = useState(false);
    const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
    const [contactSearch, setContactSearch] = useState('');

    useEffect(() => {
        fetchProfiles();
    }, [activeTab]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', activeTab)
                .order('display_name', { ascending: true });

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Error fetching profiles:', error);
            Alert.alert('Hata', 'Kullanıcı listesi çekilemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (profile: Profile) => {
        // Only Admin can edit others, or user can edit self (though UI logic here is Admin focused for Roles)
        if (!isAdmin && profile.id !== user?.id) {
            Alert.alert('Yetkisiz', 'Sadece yöneticiler düzenleme yapabilir.');
            return;
        }

        setEditingProfile(profile);
        setEditName(profile.display_name || '');
        setEditPhone(profile.phone || '');
        setEditRole(profile.role);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!editingProfile) return;

        setLoading(true);
        try {
            // 1. Update Basic Info (Name, Phone)
            const { error: basicError } = await supabase
                .from('profiles')
                .update({
                    display_name: editName,
                    phone: editPhone
                })
                .eq('id', editingProfile.id);

            if (basicError) throw basicError;

            // 2. Update Role (If changed and isAdmin)
            if (isAdmin && editRole !== editingProfile.role) {
                const { error: roleError } = await supabase.functions.invoke('set_user_role', {
                    body: {
                        target_user_id: editingProfile.id,
                        new_role: editRole
                    }
                });

                if (roleError) throw roleError;
            }

            Alert.alert('Başarılı', 'Kullanıcı güncellendi.');
            setModalVisible(false);
            fetchProfiles(); // Refresh list

        } catch (error: any) {
            console.error('Update Error:', error);
            Alert.alert('Hata', 'Güncelleme başarısız: ' + (error.message || 'Bilinmeyen hata'));
        } finally {
            setLoading(false);
        }
    };

    const openContactPicker = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            });
            if (data.length > 0) {
                setDeviceContacts(data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0));
                setContactPickerVisible(true);
            } else {
                Alert.alert('Bilgi', 'Rehberde telefon numarası olan kişi bulunamadı.');
            }
        } else {
            Alert.alert('İzin Gerekli', 'Rehbere erişim izni vermelisiniz.');
        }
    };

    const selectContact = (contact: Contacts.Contact) => {
        const phone = contact.phoneNumbers?.[0]?.number;
        if (phone) {
            // Normalize phone: remove non-digits (except +)
            const normalized = phone.replace(/[^0-9+]/g, '');
            setEditPhone(normalized);
            setContactPickerVisible(false);
        }
    };

    // Filtered Device Contacts
    const filteredDeviceContacts = deviceContacts.filter(c =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase())
    );

    const renderProfile = ({ item }: { item: Profile }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleEdit(item)}
        >
            <View style={styles.cardContent}>
                <View style={[styles.avatar, item.role === 'mesveret_admin' ? { backgroundColor: theme.colors.secondary } : {}]}>
                    <Text style={[styles.avatarText, item.role === 'mesveret_admin' ? { color: '#fff' } : {}]}>
                        {item.display_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.name}>{item.display_name || 'İsimsiz'}</Text>
                    <Text style={styles.phone}>{item.phone || 'Telefon yok'}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={[styles.badge, styles[`badge_${item.role}`]]}>
                            <Text style={styles.badgeText}>
                                {item.role === 'mesveret_admin' ? 'Meşveret' : item.role === 'accountant' ? 'Muhasebe' : 'Sohbet'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionsContainer}>
                    {item.phone && (
                        <>
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)} style={[styles.actionBtn, styles.callBtn]}>
                                <Ionicons name="call" size={16} color="#0284C7" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)} style={[styles.actionBtn, styles.whatsappBtn]}>
                                <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                            </TouchableOpacity>
                        </>
                    )}
                    {isAdmin && (
                        <Ionicons name="create-outline" size={20} color="#9CA3AF" style={{ marginLeft: 4 }} />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Heyetler" backButton>
                <View style={styles.segmentContainer}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'mesveret_admin' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('mesveret_admin')}
                    >
                        <Text style={[styles.segmentText, activeTab === 'mesveret_admin' && styles.segmentTextActive]}>Meşveret</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'sohbet_member' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('sohbet_member')}
                    >
                        <Text style={[styles.segmentText, activeTab === 'sohbet_member' && styles.segmentTextActive]}>Sohbet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'accountant' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('accountant')}
                    >
                        <Text style={[styles.segmentText, activeTab === 'accountant' && styles.segmentTextActive]}>Muhasebe</Text>
                    </TouchableOpacity>
                </View>
            </PremiumHeader>

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} size="large" color={theme.colors.primary} />
                ) : (
                    <FlatList
                        data={profiles}
                        keyExtractor={item => item.id}
                        renderItem={renderProfile}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>Bu grupta kayıtlı kullanıcı yok.</Text>
                                <Text style={styles.emptySubText}>Yeni kişiler uygulamaya kayıt olduğunda burada görünecektir.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Edit Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Kişi Düzenle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Ad Soyad</Text>
                        <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

                        <Text style={styles.label}>Telefon</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={editPhone}
                                onChangeText={setEditPhone}
                                keyboardType="phone-pad"
                                placeholder="+90..."
                            />
                            <TouchableOpacity style={styles.pickBtn} onPress={openContactPicker}>
                                <Ionicons name="people" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {isAdmin && (
                            <>
                                <Text style={styles.label}>Rol / Yetki</Text>
                                <View style={styles.roleContainer}>
                                    <TouchableOpacity
                                        style={[styles.roleBtn, editRole === 'sohbet_member' && styles.roleBtnActive]}
                                        onPress={() => setEditRole('sohbet_member')}
                                    >
                                        <Text style={[styles.roleBtnText, editRole === 'sohbet_member' && styles.roleBtnTextActive]}>Sohbet</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.roleBtn, editRole === 'mesveret_admin' && styles.roleBtnActive]}
                                        onPress={() => setEditRole('mesveret_admin')}
                                    >
                                        <Text style={[styles.roleBtnText, editRole === 'mesveret_admin' && styles.roleBtnTextActive]}>Meşveret</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.roleBtn, editRole === 'accountant' && styles.roleBtnActive]}
                                        onPress={() => setEditRole('accountant')}
                                    >
                                        <Text style={[styles.roleBtnText, editRole === 'accountant' && styles.roleBtnTextActive]}>Muhasebe</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.roleHint}>
                                    {editRole === 'mesveret_admin' ? 'Tam Yetki: Karar alma, görev atama, bildirim gönderme.' :
                                        editRole === 'accountant' ? 'Muhasebe Yetkisi: Gelir/Gider ekleme ve görüntüleme.' :
                                            'Standart Yetki: Sadece okuma ve görev alma.'}
                                </Text>
                            </>
                        )}

                        <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>KAYDET</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Contact Picker Modal */}
            <Modal visible={isContactPickerVisible} animationType="fade">
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setContactPickerVisible(false)}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.pickerTitle}>Rehberden Seç</Text>
                        <View style={{ width: 28 }} />
                    </View>
                    <TextInput
                        style={styles.pickerSearch}
                        placeholder="Kişi Ara..."
                        value={contactSearch}
                        onChangeText={setContactSearch}
                    />
                    <FlatList
                        data={filteredDeviceContacts}
                        keyExtractor={(item) => item.id || Math.random().toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.contactItem} onPress={() => selectContact(item)}>
                                <View style={styles.contactAvatar}>
                                    <Text style={styles.contactAvatarText}>{item.name?.[0]}</Text>
                                </View>
                                <View>
                                    <Text style={styles.contactName}>{item.name}</Text>
                                    <Text style={styles.contactPhone}>{item.phoneNumbers?.[0]?.number}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    content: { flex: 1, marginTop: -20 },
    listContent: { padding: 16, paddingBottom: 100 },
    // Segments
    segmentContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 4, marginTop: 8 },
    segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
    segmentBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    segmentText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
    segmentTextActive: { color: theme.colors.primary, fontWeight: 'bold' },

    // Card
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
    infoContainer: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
    phone: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
    actionsContainer: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    callBtn: { backgroundColor: '#E0F2FE' },
    whatsappBtn: { backgroundColor: '#DCFCE7' },

    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F3F4F6' },
    badge_mesveret_admin: { backgroundColor: '#FEF3C7' },
    badge_accountant: { backgroundColor: '#DBEAFE' },
    badge_sohbet_member: { backgroundColor: '#F3F4F6' },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#4B5563' },

    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
    emptySubText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, maxWidth: '80%' },

    // Edit Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.onSurface },
    label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 4, marginLeft: 2 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 16 },
    pickBtn: { width: 48, height: 48, backgroundColor: theme.colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 0 },

    roleContainer: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    roleBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, alignItems: 'center' },
    roleBtnActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
    roleBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    roleBtnTextActive: { color: '#fff' },
    roleHint: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 24, marginTop: 4 },

    btnSave: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    btnSaveText: { fontWeight: 'bold', color: '#fff', fontSize: 16, letterSpacing: 1 },

    // Picker Modal
    pickerContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    pickerTitle: { fontSize: 18, fontWeight: 'bold' },
    pickerSearch: { margin: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 12, fontSize: 16 },
    contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    contactAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#6b7280' },
    contactName: { fontSize: 16, fontWeight: '500' },
    contactPhone: { fontSize: 14, color: '#6b7280' }
});


