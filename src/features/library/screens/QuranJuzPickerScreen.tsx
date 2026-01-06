import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Q_TOTAL_JUZ, Q_JUZ_MAP } from '@/config/quranMaps';
import { theme } from '@/config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const QuranJuzPickerScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const juzData = Array.from({ length: Q_TOTAL_JUZ }, (_, i) => ({
        id: i + 1,
        page: Q_JUZ_MAP[i + 1]
    }));

    const handlePress = (page: number) => {
        navigation.navigate('QuranPdfReader', { page });
    };

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
                    <Text style={styles.headerTitle}>Cüz Seçimi</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.cardContent}>
                <FlatList
                    data={juzData}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item} onPress={() => handlePress(item.page)}>
                            <Text style={styles.juzNum}>{item.id}. Cüz</Text>
                            <Text style={styles.pageNum}>Sayfa {item.page}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    headerBackground: {
        height: '30%',
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
        paddingTop: 8,
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    item: {
        flex: 1 / 3,
        aspectRatio: 1,
        backgroundColor: '#f8fafc',
        margin: 6,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    juzNum: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    pageNum: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500'
    }
});
