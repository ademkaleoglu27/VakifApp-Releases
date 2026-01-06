import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Platform, StatusBar, Modal, TextInput } from 'react-native';
import { theme } from '@/config/theme';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { PageStepper } from '@/components/PageStepper';
import { supabase } from '@/services/supabaseClient';

interface ReadingEntry {
    readingLog: any;
    contactReading: any | null;
}

export const AddReadingLogScreen = () => {
    const { user } = useAuthStore();
    const [pages, setPages] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [readings, setReadings] = useState<ReadingEntry[]>([]);

    // Person Selection
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const canSelectUser = user?.role === 'mesveret_admin' || user?.role === 'accountant';

    useFocusEffect(
        useCallback(() => {
            loadReadings();
            if (canSelectUser) {
                loadContacts();
            }
        }, [canSelectUser])
    );

    const loadContacts = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('display_name', { ascending: true });

            if (error) throw error;
            setContacts(data || []);
        } catch (e) {

            Alert.alert('Hata', 'Kisi listesi yuklenemedi.');
        }
    };

    const loadReadings = async () => {
        if (!user?.id) return;
        const data = await RisaleUserDb.getUserReadingHistory(user.id);
        setReadings(data);
    };

    const handleSubmit = async () => {
        if (!pages || parseInt(pages) === 0) {
            Alert.alert('Hata', 'Lutfen sayfa sayisini giriniz.');
            return;
        }

        setIsLoading(true);

        try {
            const pageCount = parseInt(pages);
            let addedToHistory = false;

            if (selectedContact) {
                const profileName = selectedContact.display_name;

                let localContact = await RisaleUserDb.getContactByName(profileName);
                if (!localContact) {
                    const parts = profileName.trim().split(' ');
                    const surname = parts.length > 1 ? parts.pop() : '';
                    const name = parts.join(' ');

                    const newId = await RisaleUserDb.addContact({
                        name: name || profileName,
                        surname: surname || '',
                        phone: selectedContact.phone || '',
                        address: '',
                        group_type: 'SOHBET'
                    });
                    localContact = { id: newId, name: name, surname: surname };
                }

                if (localContact) {
                    await RisaleUserDb.addContactReading(localContact.id, pageCount);
                }

                const isSelf = user?.name && user.name === profileName;
                if (isSelf) {
                    await RisaleUserDb.addReadingLog({
                        userId: user!.id,
                        workId: 'GENEL',
                        workTitle: 'Genel Okuma',
                        section: '',
                        pagesRead: pageCount,
                        durationMinutes: 0,
                        date: new Date().toISOString(),
                    });
                    addedToHistory = true;
                }
            } else {
                await RisaleUserDb.addReadingLog({
                    userId: user!.id,
                    workId: 'GENEL',
                    workTitle: 'Genel Okuma',
                    section: '',
                    pagesRead: pageCount,
                    durationMinutes: 0,
                    date: new Date().toISOString(),
                });
                addedToHistory = true;

                try {
                    if (user?.name) {
                        let myContact = await RisaleUserDb.getContactByName(user.name);
                        if (!myContact) {
                            const parts = user.name.trim().split(' ');
                            const surname = parts.length > 1 ? parts.pop() : '';
                            const name = parts.join(' ');
                            const newId = await RisaleUserDb.addContact({
                                name: name || user.name,
                                surname: surname || '',
                                phone: user.phone || '',
                                address: '',
                                group_type: 'SOHBET'
                            });
                            myContact = { id: newId };
                        }
                        if (myContact) {
                            await RisaleUserDb.addContactReading(myContact.id, pageCount);
                        }
                    }
                } catch (e) {

                }
            }

            setIsLoading(false);
            setPages('');
            if (addedToHistory) loadReadings();

            const targetName = selectedContact
                ? (selectedContact.display_name || selectedContact.name || 'Isimsiz')
                : 'Kendiniz';
            Alert.alert('Basarili', targetName + ' icin ' + pageCount + ' sayfa eklendi!');

        } catch (error: any) {
            console.error(error);
            setIsLoading(false);
            Alert.alert('Hata', 'Kayit eklenirken bir sorun olustu.');
        }
    };

    const handleDeleteReading = (entry: ReadingEntry) => {
        Alert.alert(
            'Kaydi Sil',
            entry.readingLog.pages_read + ' sayfalik okumayi silmek istiyor musunuz?',
            [
                { text: 'Iptal', style: 'cancel' },
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
                            Alert.alert('Silindi', 'Okuma kaydi silindi.');
                        } catch (error: any) {
                            Alert.alert('Hata', 'Silme islemi basarisiz.');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalPages = readings.reduce((sum, r) => sum + (r.readingLog.pages_read || 0), 0);

    const renderReadingItem = ({ item, index }: { item: ReadingEntry; index: number }) => (
        <View style={styles.readingItem}>
            <View style={styles.readingIndex}>
                <Text style={styles.readingIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.readingInfo}>
                <Text style={styles.readingPages}>{item.readingLog.pages_read} sayfa</Text>
                <Text style={styles.readingDate}>{formatDate(item.readingLog.created_at)}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteReading(item)}
            >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    const filteredContacts = contacts.filter(c =>
        (c.display_name || c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

            <View style={styles.headerArea}>
                <View>
                    <Text style={styles.headerTitle}>Gunluk Okuma</Text>
                    <Text style={styles.headerSubtitle}>Toplam: {totalPages} sayfa</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="book" size={28} color="#fff" />
                </View>
            </View>

            <View style={styles.addCardWrapper}>
                <View style={styles.addCard}>
                    {canSelectUser && (
                        <>
                            <TouchableOpacity
                                style={styles.personSelector}
                                onPress={() => setIsModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.personIcon}>
                                    <Text style={styles.personInitial}>
                                        {selectedContact ? (selectedContact.display_name || selectedContact.name || '?')[0] : (user?.name?.[0] || '?')}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.personLabel}>Okuyan Kisi</Text>
                                    <Text style={styles.personValue}>
                                        {selectedContact ? (selectedContact.display_name || selectedContact.name) : (user?.name || 'Seciniz')}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                        </>
                    )}

                    <PageStepper
                        value={pages}
                        onChange={setPages}
                        label="SAYFA SAYISI"
                        step={10}
                    />
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        <Ionicons name="add-circle-outline" size={22} color="#fff" />
                        <Text style={styles.buttonText}>
                            {isLoading ? 'EKLENIYOR...' : 'EKLE'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.historyHeaderWrapper}>
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.historyTitle}>Okuma Gecmisi (Sahsi)</Text>
                <Text style={styles.historyCount}>{readings.length} kayit</Text>
            </View>

            <FlatList
                data={readings}
                renderItem={renderReadingItem}
                keyExtractor={(item) => item.readingLog.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Henuz okuma kaydi yok</Text>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Kisi Secin</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Isim ara..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={false}
                        />

                        <FlatList
                            data={filteredContacts}
                            keyExtractor={item => item.id}
                            style={{ maxHeight: 400 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.contactItem}
                                    onPress={() => {
                                        setSelectedContact(item);
                                        setIsModalVisible(false);
                                    }}
                                >
                                    <View style={styles.contactAvatar}>
                                        <Text style={styles.contactInitial}>{(item.display_name || item.name || '?')[0]}</Text>
                                    </View>
                                    <Text style={styles.contactName}>{item.display_name || (item.name + ' ' + item.surname)}</Text>
                                    {selectedContact?.id === item.id && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyContacts}>Kisi bulunamadi.</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    headerArea: {
        backgroundColor: theme.colors.primary,
        paddingTop: Platform.OS === 'android' ? 50 : 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    headerIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },

    listContent: {
        padding: 16,
        paddingTop: 0,
    },

    addCardWrapper: {
        paddingHorizontal: 16,
    },
    addCard: {
        backgroundColor: '#fff',
        marginTop: -16,
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    historyHeaderWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 20,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
        flex: 1,
    },
    historyCount: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
    },

    readingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    readingIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    readingIndexText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
    readingInfo: { flex: 1 },
    readingPages: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    readingDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyContainer: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 8 },

    personSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16
    },
    personIcon: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center', justifyContent: 'center'
    },
    personInitial: { fontWeight: 'bold', color: theme.colors.primary, fontSize: 16 },
    personLabel: { fontSize: 12, color: '#64748B' },
    personValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    searchInput: {
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: 16
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 12
    },
    contactAvatar: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: '#E0F2FE',
        alignItems: 'center', justifyContent: 'center'
    },
    contactInitial: { fontWeight: 'bold', color: theme.colors.primary },
    contactName: { fontSize: 16, color: '#334155', flex: 1 },
    emptyContacts: { padding: 20, textAlign: 'center', color: '#94A3B8' }
});
