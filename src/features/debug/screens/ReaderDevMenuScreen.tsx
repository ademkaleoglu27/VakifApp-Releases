import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ReaderDevMenuScreen = () => {
    const navigation = useNavigation<any>();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Geliştirici Menüsü</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Virtual Page Testleri</Text>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('RisaleVirtualPageSectionList', {
                        workId: 'sozler', // Using bookId/workId 'sozler' as default test
                        workTitle: 'Sözler (VP Test)'
                    })}
                >
                    <Ionicons name="book-outline" size={32} color="#0EA5E9" />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>Sözler (Virtual Page)</Text>
                        <Text style={styles.cardDesc}>Sayfalı yapı testi (V1 Pagination)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardInfo: {
        flex: 1,
        marginLeft: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: '#64748B',
    },
});
