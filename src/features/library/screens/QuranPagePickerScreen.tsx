import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Q_TOTAL_PAGES } from '@/config/quranMaps';
import { theme } from '@/config/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const QuranPagePickerScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [inputPage, setInputPage] = useState('');

    const handleGo = () => {
        const page = parseInt(inputPage, 10);
        if (page > 0 && page <= Q_TOTAL_PAGES) {
            navigation.navigate('QuranPdfReader', { page });
            Keyboard.dismiss();
        }
    };

    const ranges = [1, 100, 200, 300, 400, 500, 600];

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
                    <Text style={styles.headerTitle}>Sayfaya Git</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.cardContent}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Sayfa Numarası (1-604)</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            placeholder="Örn: 120"
                            value={inputPage}
                            onChangeText={setInputPage}
                            maxLength={3}
                            autoFocus
                            placeholderTextColor="#cbd5e1"
                        />
                        <TouchableOpacity
                            style={[styles.goButton, (!inputPage || parseInt(inputPage) > 604) && styles.disabled]}
                            onPress={handleGo}
                            disabled={!inputPage || parseInt(inputPage) > 604}
                        >
                            <Text style={styles.goText}>Git</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.shortcutLabel}>Hızlı Erişim</Text>
                <View style={styles.grid}>
                    {ranges.map(r => (
                        <TouchableOpacity
                            key={r}
                            style={styles.shortcutBtn}
                            onPress={() => navigation.navigate('QuranPdfReader', { page: r })}
                        >
                            <Text style={styles.shortcutText}>{r}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
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
        padding: 24,
        paddingTop: 32,
    },
    inputContainer: { marginBottom: 32 },
    label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    input: {
        flex: 1,
        height: 56,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginRight: 16,
        backgroundColor: '#f8fafc',
    },
    goButton: {
        backgroundColor: theme.colors.primary,
        height: 56,
        paddingHorizontal: 32,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabled: { backgroundColor: '#cbd5e1' },
    goText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    shortcutLabel: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    shortcutBtn: {
        width: '30%',
        aspectRatio: 2,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    shortcutText: { fontSize: 18, fontWeight: '700', color: '#64748b' },
});
