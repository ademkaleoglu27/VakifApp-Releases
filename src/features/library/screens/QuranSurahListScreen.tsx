import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QURAN_SURAHS, SurahIndexItem } from '@/data/quranMushafIndex';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const QuranSurahListScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState('');

    const filteredSurahs = useMemo(() => {
        if (!search) return QURAN_SURAHS;
        const q = search.toLowerCase();
        return QURAN_SURAHS.filter(s =>
            s.nameTr.toLowerCase().includes(q) ||
            s.number.toString().includes(q)
        );
    }, [search]);

    const handlePress = (item: SurahIndexItem) => {
        navigation.navigate('QuranPdfReader', { page: item.page });
    };

    const renderItem = ({ item }: { item: SurahIndexItem }) => (
        <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
            <View style={styles.leftInfo}>
                <View style={styles.numberContainer}>
                    <Text style={styles.number}>{item.number}</Text>
                </View>
                <Text style={styles.name}>{item.nameTr}</Text>
            </View>
            <View style={styles.pageInfo}>
                <Text style={styles.pageText}>S. {item.page}</Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Premium Header Background */}
            <View style={styles.headerBackground}>
                <LinearGradient
                    colors={[theme.colors.primary, '#0f766e']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.decorativeCircle} />
            </View>

            {/* Header Content */}
            <View style={[styles.headerArea, { paddingTop: insets.top }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Sureler</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.cardContent}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Sure ara (isim veya numara)..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#94a3b8"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={filteredSurahs}
                    keyExtractor={(item) => item.number.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    headerBackground: {
        height: '30%', // Slightly shorter for lists
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: theme.colors.primary,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    decorativeCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.5 }],
    },
    headerArea: {
        paddingHorizontal: 24,
        marginBottom: 16,
        zIndex: 10
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },

    cardContent: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        paddingTop: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        marginHorizontal: 24,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    searchInput: { flex: 1, fontSize: 16, color: '#334155', height: '100%' },

    list: { paddingHorizontal: 24, paddingBottom: 40 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    leftInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    numberContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#ecfdf5', // Light emerald
        justifyContent: 'center',
        alignItems: 'center',
    },
    number: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
    name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    pageInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pageText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' }
});
