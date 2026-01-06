import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

export const NoAccess = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="lock-closed-outline" size={64} color={theme.colors.error || '#EF4444'} />
                <Text style={styles.title}>Erişim İzni Yok</Text>
                <Text style={styles.message}>Bu bölüme erişim yetkiniz bulunmamaktadır.</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 32,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        width: '100%',
        maxWidth: 400,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
    },
});
