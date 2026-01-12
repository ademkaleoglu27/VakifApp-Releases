import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const LibraryScreen = () => {
    const navigation = useNavigation<any>();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <LinearGradient
                colors={[theme.colors.primary, '#1e3a8a']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Vakıf Kütüphanesi</Text>
                    <Text style={styles.headerSubtitle}>İlim ve İrfan Hazinesi</Text>
                </View>
            </LinearGradient>

            <View style={styles.cardsContainer}>
                {/* Kuran-ı Kerim Card */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('QuranHomeScreen')}
                >
                    <LinearGradient
                        colors={['#0f766e', '#0d9488']}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Ionicons name="book" size={32} color="white" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.cardTitle}>Kuran-ı Kerim</Text>
                                <Text style={styles.cardDesc}>Mushaf okuma, sureler ve cüz takibi.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Risale-i Nur Card */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('LibraryDetail', { libraryId: 'risale_nur' })}
                >
                    <LinearGradient
                        colors={['#b45309', '#d97706']}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Ionicons name="library" size={32} color="white" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.cardTitle}>Risale-i Nur</Text>
                                <Text style={styles.cardDesc}>Külliyat okumaları ve tahliller.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Coming Soon */}
                <View style={[styles.card, { opacity: 0.7 }]}>
                    <View style={[styles.cardGradient, { backgroundColor: '#f1f5f9' }]}>
                        <View style={styles.cardContent}>
                            <View style={[styles.iconContainer, { backgroundColor: '#cbd5e1' }]}>
                                <Ionicons name="mic" size={32} color="#64748b" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.cardTitle, { color: '#64748b' }]}>Sesli Kütüphane</Text>
                                <Text style={[styles.cardDesc, { color: '#94a3b8' }]}>Yakında eklenecek.</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginTop: 10,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    cardsContainer: {
        padding: 20,
        marginTop: -20, // Overlap header
    },
    card: {
        marginBottom: 16,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    cardGradient: {
        borderRadius: 20,
        padding: 20,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },
});
