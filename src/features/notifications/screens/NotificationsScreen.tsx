
import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useNotifications } from '@/context/NotificationsContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export const NotificationsScreen = () => {
    const { notifications, refreshNotifications, markRead } = useNotifications();

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, !item.is_read && styles.unreadCard]}
            onPress={() => markRead(item.id)}
        >
            <View style={styles.header}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>
                    {format(new Date(item.created_at), 'd MMM HH:mm', { locale: tr })}
                </Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.topBar}>
                <Text style={styles.headerTitle}>Bildirimler</Text>
            </View>
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={i => i.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refreshNotifications} />
                }
                ListEmptyComponent={
                    <Text style={styles.empty}>Henüz bildiriminiz yok.</Text>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    topBar: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
    list: { padding: 16 },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    unreadCard: { borderLeftWidth: 4, borderLeftColor: '#0ea5e9', backgroundColor: '#f0f9ff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    title: { fontWeight: '600', fontSize: 16, color: '#1e293b', flex: 1 },
    date: { fontSize: 12, color: '#94a3b8' },
    body: { color: '#475569', fontSize: 14, lineHeight: 20 },
    empty: { textAlign: 'center', marginTop: 40, color: '#94a3b8' }
});
