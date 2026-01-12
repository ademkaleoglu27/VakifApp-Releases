import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { getLibrary, Work } from '@/data/libraryRegistry';
import { LinearGradient } from 'expo-linear-gradient';

export const LibraryDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { libraryId } = route.params;

    const library = getLibrary(libraryId);

    if (!library) {
        return (
            <View style={styles.center}>
                <Text>Kütüphane bulunamadı.</Text>
            </View>
        );
    }

    const handleWorkPress = (work: Work) => {
        if (work.status === 'ready') {
            navigation.navigate('WorkDetail', { workId: work.workId });
        } else {
            Alert.alert('Yakında', `${work.title} çok yakında eklenecektir.`);
        }
    };

    const renderItem = ({ item }: { item: Work }) => (
        <TouchableOpacity
            style={[styles.card, item.status !== 'ready' && styles.disabledCard]}
            onPress={() => handleWorkPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.cardContent}>
                <View style={styles.bookIcon}>
                    <Ionicons name="book" size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookDesc} numberOfLines={2}>{item.description}</Text>
                    {item.status !== 'ready' && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Yakında</Text>
                        </View>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.colors.primary, '#1e3a8a']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{library.title}</Text>
                <Text style={styles.headerSub}>{library.description}</Text>
            </LinearGradient>

            <FlatList
                data={library.works}
                renderItem={renderItem}
                keyExtractor={item => item.workId}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginTop: 8 },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
    list: { padding: 20 },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
    },
    disabledCard: { opacity: 0.7 },
    cardContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    bookIcon: {
        width: 56, height: 56, borderRadius: 12, backgroundColor: '#f1f5f9',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    cardInfo: { flex: 1 },
    bookTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
    bookDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
    badge: {
        alignSelf: 'flex-start', backgroundColor: '#e2e8f0', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 2, marginTop: 6
    },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' }
});
