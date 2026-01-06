import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { NotificationService } from '@/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { canAccess } from '@/config/permissions';
import { useAuthStore } from '@/store/authStore';

export const AgendaScreen = () => {
    const { user } = useAuthStore();
    const [events, setEvents] = useState<any[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [eventType, setEventType] = useState('DERS'); // DERS, TOPLANTI, DIGER

    useEffect(() => {
        NotificationService.registerForPushNotificationsAsync();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadEvents();
        }, [])
    );

    const loadEvents = async () => {
        try {
            const items = await RisaleUserDb.getAgendaItems();
            setEvents(items);
        } catch (error) {
            console.error('Failed to load agenda events:', error);
            // Optional: Alert user or show empty state with error
        }
    };

    const handleSave = async () => {
        if (!title) {
            Alert.alert('Hata', 'Lütfen bir başlık giriniz.');
            return;
        }

        try {
            // Schedule Notifications
            const notifId1 = await NotificationService.scheduleAgendaNotification(title, date, 'ONE_DAY_BEFORE');
            const notifId2 = await NotificationService.scheduleAgendaNotification(title, date, 'SAME_DAY');

            const notificationIds = [];
            if (notifId1) notificationIds.push(notifId1);
            if (notifId2) notificationIds.push(notifId2);

            await RisaleUserDb.addAgendaItem({
                title,
                description: '',
                location,
                event_date: date.toISOString(),
                type: eventType,
                notification_ids: notificationIds
            });

            setModalVisible(false);
            resetForm();
            loadEvents();
            Alert.alert('Başarılı', 'Etkinlik oluşturuldu ve hatırlatmalar kuruldu.');
        } catch (e) {
            Alert.alert('Hata', 'Etkinlik oluşturulurken bir hata oluştu.');
            console.error(e);
        }
    };

    const handleDelete = async (item: any) => {
        Alert.alert('Sil', 'Bu etkinliği silmek istiyor musunuz?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive', onPress: async () => {
                    // Cancel notifications
                    if (item.notification_ids) {
                        const ids = JSON.parse(item.notification_ids);
                        for (const id of ids) {
                            await NotificationService.cancelNotification(id);
                        }
                    }
                    await RisaleUserDb.deleteAgendaItem(item.id);
                    loadEvents();
                }
            }
        ]);
    };

    const resetForm = () => {
        setTitle('');
        setLocation('');
        setDate(new Date());
        setEventType('DERS');
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const showAndroidPicker = (currentMode: 'date' | 'time', nextValue?: Date) => {
        DateTimePickerAndroid.open({
            value: nextValue || date,
            onChange: (event, selectedDate) => {
                const currentDate = selectedDate || nextValue || date;
                if (event.type === 'set') {
                    setDate(currentDate);
                    // If date was set, now show time picker if we started with date
                    if (currentMode === 'date') {
                        showAndroidPicker('time', currentDate);
                    }
                }
            },
            mode: currentMode,
            is24Hour: true,
        });
    };

    const showPicker = () => {
        if (Platform.OS === 'android') {
            showAndroidPicker('date');
        } else {
            setShowDatePicker(true);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const eventDate = new Date(item.event_date);
        const isPast = eventDate < new Date();

        return (
            <View style={[styles.card, isPast && styles.cardPast]}>
                <View style={styles.dateBox}>
                    <Text style={styles.dayText}>{eventDate.getDate()}</Text>
                    <Text style={styles.monthText}>{eventDate.toLocaleString('tr-TR', { month: 'short' })}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={[styles.title, isPast && styles.textPast]}>{item.title}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.metaText}>{eventDate.getHours()}:{eventDate.getMinutes().toString().padStart(2, '0')}</Text>

                        {item.location && (
                            <>
                                <View style={styles.dot} />
                                <Ionicons name="location-outline" size={14} color="#64748B" />
                                <Text style={styles.metaText}>{item.location}</Text>
                            </>
                        )}
                    </View>
                    <View style={[styles.tag,
                    item.type === 'DERS' ? styles.tagDers :
                        item.type === 'TOPLANTI' ? styles.tagToplanti : styles.tagDiger
                    ]}>
                        <Text style={[styles.tagText,
                        item.type === 'DERS' ? styles.tagTextDers :
                            item.type === 'TOPLANTI' ? styles.tagTextToplanti : styles.tagTextDiger
                        ]}>{item.type}</Text>
                    </View>
                </View>

                {canAccess(user?.role || 'sohbet_member', 'MANAGE_AGENDA') && (
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Ajanda" backButton={false} />

            <FlatList
                data={events}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Henüz planlanmış bir etkinlik yok.</Text>
                    </View>
                }
            />

            {canAccess(user?.role || 'sohbet_member', 'MANAGE_AGENDA') && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Add Event Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Etkinlik</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Etkinlik Başlığı"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Konum (Opsiyonel)"
                            value={location}
                            onChangeText={setLocation}
                        />

                        <TouchableOpacity style={styles.dateBtn} onPress={showPicker}>
                            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                            <Text style={styles.dateBtnText}>
                                {date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && Platform.OS === 'ios' && (
                            <DateTimePicker
                                value={date}
                                mode="datetime"
                                display="default"
                                onChange={onDateChange}
                            />
                        )}

                        <View style={styles.typeContainer}>
                            {['DERS', 'TOPLANTI', 'DIGER'].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeBtn, eventType === t && styles.typeBtnActive]}
                                    onPress={() => setEventType(t)}
                                >
                                    <Text style={[styles.typeBtnText, eventType === t && styles.typeBtnTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>KAYDET VE HATIRLAT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    list: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    cardPast: { opacity: 0.6, backgroundColor: '#F1F5F9' },
    dateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        width: 50,
        height: 50,
        marginRight: 12,
    },
    dayText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
    monthText: { fontSize: 11, color: theme.colors.primary, textTransform: 'uppercase' },
    info: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    textPast: { textDecorationLine: 'line-through', color: '#64748B' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    metaText: { fontSize: 12, color: '#64748B', marginLeft: 4 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 6 },

    tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    tagDers: { backgroundColor: '#FEF3C7' },
    tagToplanti: { backgroundColor: '#E0E7FF' },
    tagDiger: { backgroundColor: '#F3F4F6' },

    tagText: { fontSize: 10, fontWeight: 'bold' },
    tagTextDers: { color: '#D97706' },
    tagTextToplanti: { color: '#4F46E5' },
    tagTextDiger: { color: '#4B5563' },

    deleteBtn: { padding: 8 },

    fab: {
        position: 'absolute', bottom: 24, right: 24,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center', alignItems: 'center',
        elevation: 6, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#94A3B8' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
    input: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16 },
    dateBtnText: { marginLeft: 8, color: theme.colors.primary, fontWeight: '600' },
    typeContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    typeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    typeBtnText: { color: '#64748B', fontWeight: '600', fontSize: 12 },
    typeBtnTextActive: { color: '#fff' },
    saveBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
