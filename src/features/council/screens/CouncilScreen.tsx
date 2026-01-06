import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
// import { useCouncilStore, CouncilType } from '@/store/councilStore'; // Deprecated
import { useContacts, useAddContact, useDeleteContact, useSync } from '@/hooks/dbHooks';

type CouncilType = 'mesveret' | 'sohbet';

type CouncilScreenProps = {
    type: CouncilType;
};

export const CouncilScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();

    // Determine type based on route name (simplified logic)
    const { type: councilType } = route.params as { type: CouncilType } || { type: route.name.includes('Sohbet') ? 'sohbet' : 'mesveret' };

    // Normalize type string for DB enum ('MESVERET' | 'SOHBET')
    const dbType = councilType === 'mesveret' ? 'MESVERET' : 'SOHBET';
    const title = councilType === 'mesveret' ? 'Meşveret Heyeti' : 'Sohbet Heyeti';

    const { data: councilMembers } = useContacts(dbType);
    const addContactMutation = useAddContact();
    const deleteContactMutation = useDeleteContact();
    const syncMutation = useSync();

    // Auto-Sync
    React.useEffect(() => {
        syncMutation.mutate();
    }, []);

    const importContact = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
            });

            if (data.length > 0) {
                // In a real app, show a modal list to select. 
                // For MVP, we'll just pick the first one or simulate a picker.
                // Let's simulation picking a random contact for proof of concept or just alert
                Alert.alert(
                    "Rehber Erişimi Başarılı",
                    `${data.length} kişi bulundu. Eklenecek kişiyi seçin (Simülasyon: İlk kişi eklenecek).`,
                    [
                        {
                            text: "İptal",
                            style: "cancel"
                        },
                        {
                            text: "İlk Kişiyi Ekle",
                            onPress: async () => {
                                const contact = data[0];
                                const name = contact.firstName || 'İsimsiz';
                                const surname = contact.lastName || '';
                                const phone = contact.phoneNumbers?.[0]?.number || '';

                                await addContactMutation.mutateAsync({
                                    name,
                                    surname,
                                    phone,
                                    group_type: dbType,
                                    address: 'Adres girilmedi'
                                });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("Rehber Boş", "Rehberinizde kişi bulunamadı.");
            }
        } else {
            Alert.alert("İzin Reddedildi", "Rehbere erişim izni vermeniz gerekiyor.");
        }
    };

    const handlePersonPress = (personId: string) => {
        // Navigate to details (To be implemented)

    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => handlePersonPress(item.id)}>
            <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.cardGradient}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name[0]}{item.surname[0]}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name} {item.surname}</Text>
                    <Text style={styles.phone}>{item.phoneNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteContactMutation.mutate(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.colors.primary, '#1e3a8a']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <TouchableOpacity onPress={importContact} style={styles.addButton}>
                    <Ionicons name="person-add" size={24} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            <FlatList
                data={councilMembers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="people" size={64} color={theme.colors.outline} />
                        <Text style={styles.emptyText}>Henüz üye eklenmemiş.</Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={importContact}>
                            <Text style={styles.emptyButtonText}>Rehberden Kişi Ekle</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
    },
    addButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    list: {
        padding: 16,
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        backgroundColor: 'white',
    },
    cardGradient: {
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: theme.colors.onSecondary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
    },
    phone: {
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        color: theme.colors.onSurfaceVariant,
        fontSize: 16,
    },
    emptyButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: theme.colors.primary,
        borderRadius: 30,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
