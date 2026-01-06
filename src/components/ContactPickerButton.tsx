import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

interface ContactPickerButtonProps {
    onContactSelected: (name: string, surname: string, phone: string) => void;
}

export const ContactPickerButton: React.FC<ContactPickerButtonProps> = ({ onContactSelected }) => {

    const handlePickContact = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName, Contacts.Fields.LastName],
                });

                if (data.length > 0) {
                    // Start simplified picker flow (since we can't pop native UI easily in managed workflow without detach in some versions, 
                    // but contacts.getContactsAsync fetches ALL. 
                    // Better approach for large lists: Use a Modal with FlatList inside the App.
                    // For MVP, lets try to present a Modal internally.)

                    // Actually, expo-contacts doesn't have a UI picker. We must build one.
                    // To keep it simple, I will return the full list to the parent to display in a Modal? 
                    // Or I build a simple modal here?
                    // I will change the props to return the list, or better, implement the Modal here.
                    Alert.alert('Geliştirici Notu', 'Expo Contacts UI desteklemiyor. Kişi listesi modalını ana ekrana entegre ediyorum.');
                    // This component strategy needs Supabase-like listing. I will integrate the logic directly into ContactsScreen to share the Modal state.
                    return;
                } else {
                    Alert.alert('Rehber Boş', 'Kişi bulunamadı.');
                }
            } else {
                Alert.alert('İzin Gerekli', 'Rehbere erişim izni vermelisiniz.');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Rehber açılırken hata oluştu.');
        }
    };

    return (
        <TouchableOpacity onPress={handlePickContact} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#EFF6FF', borderRadius: 12, marginTop: 8 }}>
            <Ionicons name="people" size={20} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, color: theme.colors.primary, fontWeight: '600' }}>Rehberden Seç</Text>
        </TouchableOpacity>
    );
};
