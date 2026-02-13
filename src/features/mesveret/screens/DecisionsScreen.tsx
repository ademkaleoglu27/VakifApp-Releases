import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Share, StatusBar, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { RisaleUserDb } from '@/services/risaleUserDb'; 
import { theme } from '@/config/theme';
import { PremiumHeader } from '@/components/PremiumHeader';
import * as ImagePicker from 'expo-image-picker';

import { requireFeature } from '@/utils/guard';
import { NoAccess } from '@/components/NoAccess';

const { width, height } = Dimensions.get('window');

import { useDecisions, useAddDecision, useDeleteDecision, useSync, useAddDecisionItem, Decision } from '@/hooks/dbHooks';
import { useAuthStore } from '@/store/authStore';
import { getSupabaseClient } from '@/services/supabaseClient';
import { generateUUID } from '@/utils/uuid';

export const DecisionsScreen = () => {
    if (!requireFeature('MESVERET_SCREEN')) return <NoAccess />;

    const { data: decisions, isLoading, refetch } = useDecisions();
    const addDecisionMutation = useAddDecision();
    const addDecisionItemMutation = useAddDecisionItem();
    const deleteDecisionMutation = useDeleteDecision();
    const syncMutation = useSync();

    // Auto-Sync on Mount
    useEffect(() => {
        syncMutation.mutate();
    }, []);

    // Auth for user ID
    const user = useAuthStore(state => state.user);

    const [isModalVisible, setModalVisible] = useState(false);

    // Image State (Temporarily disabled for Supabase V1)
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [viewImageUri, setViewImageUri] = useState<string | null>(null);

    // Date Filtering
    const [currentDate, setCurrentDate] = useState(new Date());

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); // Still used for Summary
    const [items, setItems] = useState<string[]>([]);
    const [currentItem, setCurrentItem] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addItem = () => {
        if (currentItem.trim()) {
            setItems([...items, currentItem.trim()]);
            setCurrentItem('');
        }
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleAddDecision = async () => {
        if (!title) {
            Alert.alert('Hata', 'Lütfen en azından bir başlık giriniz.');
            return;
        }

        setIsSubmitting(true);
        try {
            const newId = generateUUID();
            let finalAttachmentUrl = imageUri;

            // 1. Upload Image if exists and not http (meaning local file)
            if (imageUri && !imageUri.startsWith('http')) {
                const supabase = getSupabaseClient();
                if (supabase) {
                    const filename = `${newId}_${Date.now()}.jpg`;
                    const formData = new FormData();
                    formData.append('file', {
                        uri: imageUri,
                        name: filename,
                        type: 'image/jpeg',
                    } as any);

                    const { data, error } = await supabase.storage
                        .from('decision-attachments')
                        .upload(filename, formData, { contentType: 'image/jpeg' });

                    if (error) {
                        console.error('Upload Error:', error);
                        Alert.alert('Uyarı', 'Resim yüklenemedi, yerel kopya kullanılacak.');
                    } else if (data) {
                        // Construct Public URL
                        const { data: publicUrlData } = supabase.storage
                            .from('decision-attachments')
                            .getPublicUrl(filename);
                        finalAttachmentUrl = publicUrlData.publicUrl;
                    }
                }
            }

            // 2. Create Decision
            await addDecisionMutation.mutateAsync({
                id: newId,
                title: title.trim(),
                summary: content.trim(), // Optional summary
                date: new Date().toISOString(),
                created_by: user?.id || null,
                attachment_url: finalAttachmentUrl,
            });

            // 3. Create Items
            for (const [index, itemText] of items.entries()) {
                await addDecisionItemMutation.mutateAsync({
                    decision_id: newId,
                    content: itemText,
                    sort_order: index,
                    is_completed: false
                });
            }

            setModalVisible(false);
            resetForm();

        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Karar eklenirken bir sorun oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setItems([]);
        setImageUri(null);
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera izni vermelisiniz.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleNotify = (decision: Decision) => {
        Alert.alert(
            'Bildirim Gönder',
            'Bu kararı hangi grupla paylaşmak istersiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Meşveret Heyeti', onPress: () => shareDecision(decision, 'Meşveret Heyeti') },
                { text: 'Sohbet Heyeti', onPress: () => shareDecision(decision, 'Sohbet Heyeti') },
                { text: 'Herkes', onPress: () => shareDecision(decision, 'Tüm Heyetler') }
            ]
        );
    };

    const shareDecision = async (decision: Decision, groupName: string) => {
        try {
            const message = `📢 *KARAR DUYURUSU*\n\n📅 ${new Date(decision.created_at).toLocaleDateString('tr-TR')}\n\n📌 *${decision.title}*\n\n${decision.summary}\n\n👥 _${groupName}_`;
            await Share.share({
                message: message,
            });
        } catch (error) {
            Alert.alert('Hata', 'Paylaşım yapılamadı.');
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Kararı Sil',
            'Bu kararı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve bulut üzerinden de silinir.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => {
                        deleteDecisionMutation.mutate(id, {
                            onSuccess: () => {
                                // Optional: Alert success or just fade out
                            },
                            onError: () => {
                                Alert.alert('Hata', 'Silme işlemi başarısız.');
                            }
                        });
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Decision }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleNotify(item)} style={styles.iconBtn}>
                        <Ionicons name="share-social-outline" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.title}>{item.title}</Text>
                {item.summary ? <Text style={styles.content}>{item.summary}</Text> : null}

                {item.attachment_url && (
                    <View style={styles.imageAttachmentContainer}>
                        <TouchableOpacity style={styles.imagePreviewBtn} onPress={() => setViewImageUri(item.attachment_url!)}>
                            <Ionicons name="image-outline" size={20} color="#fff" />
                            <Text style={styles.imagePreviewText}>Görsel Eki</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.footerLabel}>İlgili Okumalar</Text>
                        <Text style={styles.emptyReadingText}>Henüz ekli değil.</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnAddReading}>
                            <Text style={styles.btnAddReadingText}>EKLE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const filteredDecisions = useMemo(() => {
        return (decisions || []).filter(d => {
            const dDate = new Date(d.created_at);
            return dDate.getMonth() === currentDate.getMonth() && dDate.getFullYear() === currentDate.getFullYear();
        });
    }, [decisions, currentDate]);

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Meşveret Kararları"
                backButton
            >
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={goToPreviousMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.monthLabelContainer}>
                        <Text style={styles.monthLabel}>
                            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </Text>
                        <Text style={styles.monthSubLabel}>Dönem Kayıtları</Text>
                    </View>

                    <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </PremiumHeader>

            <View style={styles.mainContent}>
                <FlatList
                    data={filteredDecisions}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="file-tray-outline" size={40} color="#9CA3AF" />
                            </View>
                            <Text style={styles.emptyText}>Bu dönem için meşveret kararı bulunamadı.</Text>
                            <TouchableOpacity style={styles.btnCreateFirst} onPress={() => setModalVisible(true)}>
                                <Text style={styles.btnCreateFirstText}>İlk Kararı Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            </View>

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* ADD Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Karar Ekle</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TextInput
                                style={styles.input}
                                placeholder="Karar Başlığı"
                                value={title}
                                onChangeText={setTitle}
                                autoComplete="off"
                                importantForAutofill="no"
                                textContentType="none"
                            />
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Genel Özet / Açıklama (İsteğe bağlı)"
                                value={content}
                                onChangeText={setContent}
                                multiline
                            />

                            {/* ITEM LIST BUILDER */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.label}>Karar Maddeleri</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                        placeholder="Madde yazın..."
                                        value={currentItem}
                                        onChangeText={setCurrentItem}
                                    />
                                    <TouchableOpacity style={styles.btnAddItem} onPress={addItem}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {items.map((item, index) => (
                                    <View key={index} style={styles.itemRow}>
                                        <Text style={styles.itemText}>{index + 1}. {item}</Text>
                                        <TouchableOpacity onPress={() => removeItem(index)}>
                                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.imagePickerContainer}>
                                <Text style={styles.label}>Görsel Ekle (Opsiyonel)</Text>
                                <View style={styles.imageButtonsRow}>
                                    <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                                        <Ionicons name="images-outline" size={24} color={theme.colors.primary} />
                                        <Text style={styles.imageBtnText}>Galeri</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                                        <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
                                        <Text style={styles.imageBtnText}>Kamera</Text>
                                    </TouchableOpacity>
                                </View>

                                {imageUri && (
                                    <View style={styles.previewContainer}>
                                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                                            <Ionicons name="trash-outline" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.btnSave, isSubmitting && { opacity: 0.7 }]}
                                onPress={handleAddDecision}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.btnSaveText}>{isSubmitting ? 'KAYDEDİLİYOR...' : 'KAYDET'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* FULL IMAGE Modal */}
            <Modal visible={!!viewImageUri} animationType="fade" transparent>
                <View style={styles.fullImageOverlay}>
                    <TouchableOpacity style={styles.closeFullImage} onPress={() => setViewImageUri(null)}>
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    {viewImageUri && (
                        <Image source={{ uri: viewImageUri as string }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    mainContent: { flex: 1, marginTop: -20 },
    list: { padding: 16, paddingBottom: 100 },

    // Month Selector
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 6,
        marginTop: 12,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabelContainer: { alignItems: 'center' },
    monthLabel: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 },
    monthSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    dateBadge: { backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#CCFBF1' },
    dateText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
    iconBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
    content: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },

    // Image Attachment
    imageAttachmentContainer: { marginTop: 12 },
    imagePreviewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6B7280', padding: 8, borderRadius: 8, alignSelf: 'flex-start', gap: 6 },
    imagePreviewText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Footer
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
    emptyReadingText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
    btnAddReading: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    btnAddReadingText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
    btnDelete: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' },

    // Empty State
    emptyContainer: { alignItems: 'center', marginTop: 40, padding: 32 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 16, marginBottom: 24 },
    btnCreateFirst: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    btnCreateFirstText: { color: '#fff', fontWeight: 'bold' },

    fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16 },
    btnSave: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    btnSaveText: { fontWeight: 'bold', color: '#fff', fontSize: 16, letterSpacing: 1 },

    // Image Picker Styles
    imagePickerContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    imageButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    imageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#BFDBFE' },
    imageBtnText: { color: theme.colors.primary, fontWeight: '600' },
    previewContainer: { position: 'absolute', top: 30, right: 0, zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    imagePreview: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
    removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#EF4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // Full Image Modal
    fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: width, height: height * 0.8 },
    closeFullImage: { position: 'absolute', top: 50, right: 20, zIndex: 20 },

    // Item List Styles
    btnAddItem: { backgroundColor: theme.colors.primary, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, marginBottom: 8 },
    itemText: { fontSize: 15, color: '#374151', flex: 1, marginRight: 8 },
});
