import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, StatusBar, Modal, TextInput, Alert, Platform, Share } from 'react-native';
import { useAnnouncements } from '@/features/announcements/hooks/useAnnouncements';
import { AnnouncementCard } from '@/features/announcements/components/AnnouncementCard';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '@/components/PremiumHeader';
import { announcementService } from '@/services/announcementService';
import { useQueryClient } from '@tanstack/react-query';
import { canAccess } from '@/config/permissions';
import { useAuthStore } from '@/store/authStore';

export const AnnouncementsScreen = () => {
    const { data: announcements, isLoading } = useAnnouncements();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // State for Modals
    const [createMode, setCreateMode] = useState<'none' | 'notification' | 'lesson'>('none');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState(''); // Only for Lesson
    const [targetRole, setTargetRole] = useState('all'); // Only for Notification
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canManage = canAccess(user?.role || 'sohbet_member', 'MESVERET_SCREEN');

    const handleAdd = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Eksik Bilgi', 'Lütfen başlık ve içerik giriniz.');
            return;
        }

        setIsSubmitting(true);
        try {
            // If Lesson, assume 'all' for now or 'sohbet_member'? 
            // User said "share on whatsapp", so it's public.
            // If Notification, use targetRole.
            const role = createMode === 'lesson' ? 'all' : targetRole;
            const loc = createMode === 'lesson' ? location : undefined;

            await announcementService.addAnnouncement(
                title,
                content,
                'normal',
                loc,
                role
            );

            setCreateMode('none');
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['announcements'] });

            if (createMode === 'lesson') {
                // Prompt to share immediately
                Alert.alert(
                    'Duyuru Oluşturuldu',
                    'Duyuru başarıyla eklendi. WhatsApp\'ta paylaşmak ister misiniz?',
                    [
                        { text: 'Hayır', style: 'cancel' },
                        { text: 'Evet, Paylaş', onPress: () => handleShare(title, content, loc) }
                    ]
                );
            } else {
                Alert.alert('Başarılı', 'Bildirim gönderildi. 🚀');
            }

        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'İşlem Başarısız'); // Silent fail handling in service, but if service throws, show this
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = async (t: string, c: string, l?: string) => {
        const message = `📢 *${t}*\n\n${c}\n\n${l ? `📍 *Konum:* ${l}` : ''}\n\n_Nur Mektebi_`;
        try {
            await Share.share({ message });
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setLocation('');
        setTargetRole('all');
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            <PremiumHeader
                title="Duyuru & Bildirim"
                subtitle="Yönetim Paneli"
            />

            {/* ACTION PANEL */}
            <View style={styles.actionPanel}>
                {/* 1. KARARLAR - Only visible to Mesveret & Accountant */}
                {canAccess(user?.role || 'sohbet_member', 'VIEW_COUNCIL_DECISIONS') && (
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#e0f2fe' }]}
                        onPress={() => navigation.navigate('Decisions')}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#0ea5e9' }]}>
                            <Ionicons name="documents" size={24} color="white" />
                        </View>
                        <Text style={styles.actionText}>Kararlar</Text>
                    </TouchableOpacity>
                )}

                {canManage && (
                    <>
                        {/* 2. BİLDİRİM GÖNDER */}
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: '#fef3c7' }]}
                            onPress={() => setCreateMode('notification')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#d97706' }]}>
                                <Ionicons name="notifications" size={24} color="white" />
                            </View>
                            <Text style={styles.actionText}>Bildirim Gönder</Text>
                        </TouchableOpacity>

                        {/* 3. DUYURU / DERS */}
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: '#dcfce7' }]}
                            onPress={() => setCreateMode('lesson')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#22c55e' }]}>
                                <Ionicons name="location" size={24} color="white" />
                            </View>
                            <Text style={styles.actionText}>Ders / Duyuru</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <Text style={styles.sectionTitle}>Geçmiş Duyurular</Text>

            <FlatList
                data={announcements}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AnnouncementCard announcement={item} />}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz kayıt yok.</Text>
                    </View>
                }
            />

            {/* MODAL: BİLDİRİM GÖNDER */}
            <Modal
                transparent
                visible={createMode === 'notification'}
                animationType="fade"
                onRequestClose={() => setCreateMode('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Hızlı Bildirim</Text>
                            <TouchableOpacity onPress={() => setCreateMode('none')}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Kime Gidecek?</Text>
                        <View style={styles.roleContainer}>
                            {[
                                { label: 'Herkes', val: 'all' },
                                { label: 'Meşveret', val: 'mesveret_admin' },
                                { label: 'Sohbet', val: 'sohbet_member' },
                                { label: 'Muhasebe', val: 'accountant' },
                            ].map((role) => (
                                <TouchableOpacity
                                    key={role.val}
                                    style={[styles.roleChip, targetRole === role.val && styles.roleChipActive]}
                                    onPress={() => setTargetRole(role.val)}
                                >
                                    <Text style={[styles.roleText, targetRole === role.val && styles.roleTextActive]}>
                                        {role.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Başlık</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Hatırlatma" />

                        <Text style={styles.label}>Mesaj</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} multiline placeholder="Kısa ve öz mesajınız..." />

                        <TouchableOpacity style={styles.sendButton} onPress={handleAdd} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.sendButtonText}>GÖNDER</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL: DERS / DUYURU */}
            <Modal
                transparent
                visible={createMode === 'lesson'}
                animationType="fade"
                onRequestClose={() => setCreateMode('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ders / Etkinlik Paylaş</Text>
                            <TouchableOpacity onPress={() => setCreateMode('none')}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Etkinlik Başlığı</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Cuma Sohbeti" />

                        <Text style={styles.label}>Açıklama / Detay</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} multiline placeholder="Saat 21:00'da..." />

                        <Text style={styles.label}>Konum / Adres</Text>
                        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Örn: Vakıf Merkezi" />

                        <TouchableOpacity style={[styles.sendButton, { backgroundColor: '#22c55e' }]} onPress={handleAdd} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.sendButtonText}>KAYDET VE PAYLAŞ</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Action Panel
    actionPanel: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        justifyContent: 'space-between',
        backgroundColor: 'white',
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05
    },
    actionCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 100
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
        textAlign: 'center'
    },
    sectionTitle: {
        padding: 16,
        paddingBottom: 8,
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b'
    },

    list: { padding: 16 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#94a3b8' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },

    roleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
    roleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    roleText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    roleTextActive: { color: 'white' },

    sendButton: { backgroundColor: '#d97706', padding: 14, borderRadius: 12, alignItems: 'center' },
    sendButtonText: { color: 'white', fontWeight: 'bold' }
});
