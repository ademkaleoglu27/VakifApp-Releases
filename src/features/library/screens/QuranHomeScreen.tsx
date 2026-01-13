import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LAST_READ_PAGE_KEY = 'q_last_page';

export const QuranHomeScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [lastPage, setLastPage] = useState<number | null>(null);

    // Refresh last page on focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            AsyncStorage.getItem(LAST_READ_PAGE_KEY).then((val) => {
                if (val) setLastPage(parseInt(val, 10));
            });
        });
        return unsubscribe;
    }, [navigation]);

    // PDF Reader removed - show alert
    const handleContinue = () => {
        Alert.alert(
            'Özellik Geçici Olarak Devre Dışı',
            'Kuran PDF okuyucu yakında yeniden eklenecektir.',
            [{ text: 'Tamam' }]
        );
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

            <View style={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerTopContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="book" size={48} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.title}>Kuran-ı Kerim</Text>
                            <Text style={styles.subtitle}>Mushaf Okuma Modu</Text>
                        </View>
                    </View>
                </View>

                {/* Main Content Card */}
                <View style={styles.cardContent}>
                    <View style={styles.quoteContainer}>
                        <Text style={styles.quoteText}>
                            "Sizin en hayırlınız Kuran'ı öğrenen ve öğreteninizdir."
                        </Text>
                        <Text style={styles.quoteSource}>- Hadis-i Şerif Meali</Text>
                    </View>

                    {/* Actions Section */}
                    <View style={styles.actions}>
                        {/* Resume Button */}
                        <TouchableOpacity
                            style={styles.resumeButton}
                            activeOpacity={0.9}
                            onPress={handleContinue}
                        >
                            <LinearGradient
                                colors={[theme.colors.secondary, '#b45309']}
                                style={styles.resumeGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View style={styles.resumeContent}>
                                    <Text style={styles.resumeTitle}>Kaldığın Yerden Devam Et</Text>
                                    <View style={styles.resumeSubtitleContainer}>
                                        <Ionicons name="bookmark" size={14} color="rgba(255,255,255,0.9)" />
                                        <Text style={styles.resumeSubtitle}>
                                            {lastPage ? `Son okunan: Sayfa ${lastPage}` : 'Henüz okumadınız'}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward-circle" size={32} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Grid Actions */}
                        <View style={styles.grid}>
                            <TouchableOpacity
                                style={styles.gridItem}
                                onPress={() => navigation.navigate('QuranSurahList')}
                            >
                                <View style={[styles.gridIconBg, { backgroundColor: '#e0f2fe' }]}>
                                    <Ionicons name="list" size={24} color="#0284c7" />
                                </View>
                                <Text style={styles.gridTitle}>Sureler</Text>
                                <Text style={styles.gridDesc}>Liste</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.gridItem}
                                onPress={() => navigation.navigate('QuranPagePicker')}
                            >
                                <View style={[styles.gridIconBg, { backgroundColor: '#fef3c7' }]}>
                                    <Ionicons name="document-text" size={24} color="#d97706" />
                                </View>
                                <Text style={styles.gridTitle}>Sayfaya Git</Text>
                                <Text style={styles.gridDesc}>No ile</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.gridItem}
                                onPress={() => navigation.navigate('QuranJuzPicker')}
                            >
                                <View style={[styles.gridIconBg, { backgroundColor: '#dcfce7' }]}>
                                    <Ionicons name="bookmarks" size={24} color="#16a34a" />
                                </View>
                                <Text style={styles.gridTitle}>Cüzler</Text>
                                <Text style={styles.gridDesc}>Cüz seç</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerBackground: {
        height: '45%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        backgroundColor: theme.colors.primary, // Fallback
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
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    header: {
        paddingHorizontal: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        marginBottom: 20,
    },
    headerTopContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: '600',
        maxWidth: 200,
    },
    cardContent: {
        flex: 1,
        marginTop: 30,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    quoteContainer: {
        marginBottom: 30,
    },
    quoteText: {
        color: '#334155',
        fontSize: 18,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 28,
        fontWeight: '500'
    },
    quoteSource: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    actions: {
        width: '100%',
        gap: 16,
    },
    resumeButton: {
        width: '100%',
        height: 80,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        marginBottom: 16,
    },
    resumeGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    resumeContent: {
        flex: 1,
    },
    resumeTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6
    },
    resumeSubtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    resumeSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    gridItem: {
        width: '31%',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    gridIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    gridTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        textAlign: 'center'
    },
    gridDesc: {
        fontSize: 10,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 2
    }
});
