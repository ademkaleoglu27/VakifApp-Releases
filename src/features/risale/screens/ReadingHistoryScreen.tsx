import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { PremiumHeader } from '@/components/PremiumHeader';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { useAuthStore } from '@/store/authStore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

interface ReadingEntry {
    readingLog: any;
    contactReading: any | null;
}

export const ReadingHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const [readings, setReadings] = useState<ReadingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedReading, setSelectedReading] = useState<ReadingEntry | null>(null);
    const [editPages, setEditPages] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadReadings();
        }, [])
    );

    const loadReadings = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const data = await RisaleUserDb.getUserReadingHistory(user.id);
            setReadings(data);
        } catch (error) {
            console.error('Error loading readings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const openEditModal = (entry: ReadingEntry) => {
        setSelectedReading(entry);
        setEditPages(entry.readingLog.pages_read.toString());
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedReading || !editPages) return;

        setIsSaving(true);
        try {
            await RisaleUserDb.updateReadingLog(
                selectedReading.readingLog.id,
                parseInt(editPages),
                selectedReading.contactReading?.id
            );
            setEditModalVisible(false);
            setSelectedReading(null);
            loadReadings();
            Alert.alert('Başarılı', 'Okuma güncellendi.');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Güncelleme başarısız.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (entry: ReadingEntry) => {
        Alert.alert(
            'Kaydı Sil',
            `${entry.readingLog.pages_read} sayfalık bu okumayı silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await RisaleUserDb.deleteReadingLog(
                                entry.readingLog.id,
                                entry.contactReading?.id
                            );
                            loadReadings();
                            Alert.alert('Başarılı', 'Okuma silindi.');
                        } catch (error: any) {
                            Alert.alert('Hata', error.message || 'Silme başarısız.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item, index }: { item: ReadingEntry; index: number }) => (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.indexBadge}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.pagesText}>{item.readingLog.pages_read} Sayfa</Text>
                    <Text style={styles.dateText}>{formatDate(item.readingLog.created_at)}</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(item)}
                >
                    <Ionicons name="create-outline" size={18} color="#F59E0B" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item)}
                >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const totalPages = readings.reduce((sum, r) => sum + (r.readingLog.pages_read || 0), 0);

    return (
        <View style={styles.container}>
            <PremiumHeader title="Okuma Geçmişi" backButton>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{readings.length}</Text>
                        <Text style={styles.statLabel}>Kayıt</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalPages}</Text>
                        <Text style={styles.statLabel}>Toplam Sayfa</Text>
                    </View>
                </View>
            </PremiumHeader>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={readings}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.readingLog.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="book-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Henüz okuma kaydınız yok.</Text>
                            <TouchableOpacity
                                style={styles.addFirstBtn}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={styles.addFirstBtnText}>İlk Okumayı Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* FAB for adding new reading */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Edit Modal */}
            <Modal visible={editModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Okumayı Düzenle</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {selectedReading && (
                            <Text style={styles.modalSubtitle}>
                                {formatDate(selectedReading.readingLog.created_at)}
                            </Text>
                        )}

                        <Text style={styles.label}>SAYFA SAYISI</Text>
                        <TextInput
                            style={styles.input}
                            value={editPages}
                            onChangeText={setEditPages}
                            keyboardType="numeric"
                            textAlign="center"
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.btnCancelText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnSave}
                                onPress={handleSaveEdit}
                                disabled={isSaving}
                            >
                                <Text style={styles.btnSaveText}>
                                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    statItem: { alignItems: 'center', paddingHorizontal: 20 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },

    list: { padding: 16, paddingBottom: 100 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    indexBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    indexText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
    cardInfo: { flex: 1 },
    pagesText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    dateText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editBtn: { backgroundColor: '#FEF3C7' },
    deleteBtn: { backgroundColor: '#FEE2E2' },

    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, color: '#94A3B8', marginTop: 16, marginBottom: 24 },
    addFirstBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    addFirstBtnText: { color: '#fff', fontWeight: 'bold' },

    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
    modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 24 },

    label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 12, letterSpacing: 1 },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    modalActions: { flexDirection: 'row', gap: 12 },
    btnCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    btnCancelText: { color: '#64748B', fontWeight: '600' },
    btnSave: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
    },
    btnSaveText: { color: '#fff', fontWeight: 'bold' },
});
