import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Modal, FlatList } from 'react-native';
import { useAddTransaction, useContacts } from '@/hooks/dbHooks';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { useNavigation } from '@react-navigation/native';
import { TransactionType, PaymentMethod } from '@/types/accounting';
import { accountingService } from '@/services/accountingService';
import { requireFeature } from '@/utils/guard';
import { NoAccess } from '@/components/NoAccess';
import { useAuthStore } from '@/store/authStore';

import { generateUUID } from '@/utils/uuid';

export const AddTransactionScreen = ({ navigation }: any) => {
    if (!requireFeature('MANAGE_ACCOUNTING')) return <NoAccess />;

    const { user } = useAuthStore();
    const addTxMutation = useAddTransaction();
    const { data: contacts } = useContacts(); // Fetch contacts for selection

    const [type, setType] = useState<TransactionType>('income');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [isContactModalVisible, setContactModalVisible] = useState(false);

    // Auto-fill description if contact selected
    React.useEffect(() => {
        if (selectedContactId && contacts) {
            const contact = contacts.find(c => c.id === selectedContactId);
            if (contact) {
                setDescription(`${contact.name} ${contact.surname} - Aidat`);
            }
        }
    }, [selectedContactId]);

    const handleSubmit = () => {
        if (!amount || !category) {
            Alert.alert('Eksik Bilgi', 'Tutar ve kategori zorunludur.');
            return;
        }

        addTxMutation.mutate({
            type,
            amount: parseFloat(amount),
            currency: 'TRY',
            category,
            description,
            date: new Date().toISOString(),
            created_by: user!.id,
            payment_method: 'cash',
            contact_id: selectedContactId || undefined
        }, {
            onSuccess: () => {
                Alert.alert('Başarılı', 'İşlem kaydedildi.', [
                    { text: 'Tamam', onPress: () => navigation.goBack() }
                ]);
            },
            onError: () => {
                Alert.alert('Hata', 'İşlem kaydedilirken bir sorun oluştu.');
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Yeni İşlem Ekle</Text>

                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'income' && styles.typeButtonSelectedIncome]}
                        onPress={() => setType('income')}
                    >
                        <Text style={[styles.typeText, type === 'income' && styles.typeTextSelected]}>GELİR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'expense' && styles.typeButtonSelectedExpense]}
                        onPress={() => setType('expense')}
                    >
                        <Text style={[styles.typeText, type === 'expense' && styles.typeTextSelected]}>GİDER</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Tutar (TL)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                />

                <Text style={styles.label}>Kategori</Text>
                <TextInput
                    style={styles.input}
                    placeholder={type === 'income' ? "Örn: Aidat, Bağış" : "Örn: Mutfak, Fatura"}
                    value={category}
                    onChangeText={setCategory}
                />

                {/* Contact Selection for Dues */}
                {type === 'income' && (category.toLowerCase().includes('aidat') || category === '') && (
                    <View>
                        <Text style={styles.label}>Kişi (İsteğe Bağlı)</Text>
                        <TouchableOpacity
                            style={styles.contactSelector}
                            onPress={() => setContactModalVisible(true)}
                        >
                            <Text style={styles.contactSelectorText}>
                                {selectedContactId
                                    ? contacts?.find(c => c.id === selectedContactId)?.name + ' ' + contacts?.find(c => c.id === selectedContactId)?.surname
                                    : 'Kişi Seçiniz...'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="İsim, not veya açıklama yazın..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                />

                <TouchableOpacity
                    style={[styles.saveButton, addTxMutation.isPending && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={addTxMutation.isPending}
                >
                    <Text style={styles.saveButtonText}>
                        {addTxMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Simple Contact Picker Modal */}
            <Modal visible={isContactModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Kişi Seç</Text>
                        <TouchableOpacity onPress={() => setContactModalVisible(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={contacts}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => {
                                    setSelectedContactId(item.id);
                                    setContactModalVisible(false);
                                }}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{item.name[0]}</Text>
                                </View>
                                <Text style={styles.contactName}>{item.name} {item.surname}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.m,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: theme.spacing.l,
        textAlign: 'center',
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outline,
        borderRadius: theme.roundness.medium,
        padding: 4,
    },
    typeButton: {
        flex: 1,
        paddingVertical: theme.spacing.s,
        alignItems: 'center',
        borderRadius: theme.roundness.small,
    },
    typeButtonSelectedIncome: {
        backgroundColor: theme.colors.secondary,
    },
    typeButtonSelectedExpense: {
        backgroundColor: theme.colors.error,
    },
    typeText: {
        fontWeight: 'bold',
        color: theme.colors.onSurfaceVariant,
    },
    typeTextSelected: {
        color: '#FFFFFF',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: theme.spacing.s,
        marginTop: theme.spacing.m,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outline,
        borderRadius: theme.roundness.medium,
        padding: theme.spacing.m,
        fontSize: 16,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.m,
        borderRadius: theme.roundness.medium,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: theme.colors.onPrimary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    contactSelector: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outline,
        borderRadius: theme.roundness.medium,
        padding: theme.spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    contactSelectorText: {
        fontSize: 16,
        color: theme.colors.onSurface
    },
    modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
    modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeBtn: { padding: 4 },
    contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontWeight: 'bold' },
    contactName: { fontSize: 16, fontWeight: '500' }
});
