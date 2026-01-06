import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { theme } from '@/config/theme';
import { LinearGradient } from 'expo-linear-gradient';

export const LoginScreen = () => {
    // ... existing state and logic ...
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setPasswordVisible] = useState(false);

    // Auth Store
    const { login, setLoading, isLoading } = useAuthStore();

    // ... existing handleSubmit ...
    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi giriniz.');
            return;
        }

        if (isRegistering && !name) {
            Alert.alert('Hata', 'Lütfen ad ve soyadınızı giriniz.');
            return;
        }

        try {
            setLoading(true);

            let user, token;

            if (isRegistering) {
                // Register Flow
                const result = await authService.register(email, password, name);
                user = result.user;
                token = result.token;
                Alert.alert('Hoşgeldiniz', 'Kayıt başarılı! Giriş yapılıyor...');
            } else {
                // Login Flow
                const result = await authService.login(email, password);
                user = result.user;
                token = result.token;
            }

            login(user, token);
        } catch (error: any) {
            console.error(error);

            let errorMessage = error.message || 'Bir sorun oluştu.';

            // Handle Supabase/Auth specific errors
            if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
                errorMessage = 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapmayı deneyiniz.';
            } else if (errorMessage.includes('Invalid login credentials')) {
                errorMessage = 'E-posta veya şifre hatalı.';
            }

            Alert.alert(
                isRegistering ? 'Kayıt Hatası' : 'Giriş Hatası',
                errorMessage
            );
        } finally {
            setLoading(false);
        }
    };


    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setName('');
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', theme.colors.primary]} // Deep slate to Primary Green
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.gradientBg}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Spiritual Intro Section */}
                    <View style={styles.introSection}>
                        <View style={styles.verseContainer}>
                            <Text style={styles.arabicVerse}>اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ</Text>
                            <Text style={styles.turkishMeal}>"Yaratan Rabbinin adıyla oku!"</Text>
                            <Text style={styles.verseSource}>- Alak Suresi, 1. Ayet</Text>
                        </View>

                        <LinearGradient
                            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                            style={styles.quoteBanner}
                        >
                            <Ionicons name="book" size={24} color="#FFD700" style={{ marginBottom: 8 }} />
                            <Text style={styles.quoteText}>
                                "Okuyalım kardeşim, okuyalım ki dünyamız ve ahiretimiz güzelleşsin."
                            </Text>
                            <Text style={styles.quoteAuthor}>— Zübeyir Gündüzalp</Text>
                        </LinearGradient>
                    </View>

                    {/* Auth Box */}
                    <View style={styles.authBox}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Nur Mektebi</Text>
                            <Text style={styles.subtitle}>{isRegistering ? 'Yeni Kardeş Kaydı' : 'Giriş Kapısı'}</Text>
                        </View>

                        <View style={styles.form}>
                            {isRegistering && (
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputIcon}>
                                        <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ad Soyad"
                                        placeholderTextColor="#94A3B8"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                        editable={!isLoading}
                                    />
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <View style={styles.inputIcon}>
                                    <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="E-Posta Adresi"
                                    placeholderTextColor="#94A3B8"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!isLoading}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputIcon}>
                                    <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Şifre"
                                    placeholderTextColor="#94A3B8"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    editable={!isLoading}
                                />
                                <TouchableOpacity
                                    onPress={() => setPasswordVisible(!isPasswordVisible)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>
                                        {isRegistering ? 'Bismillah, Kayıt Ol' : 'Giriş Yap'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.switchButton} onPress={toggleMode}>
                                <Text style={styles.switchText}>
                                    {isRegistering
                                        ? 'Zaten hesabınız var mı? Giriş Yap'
                                        : 'Aramıza katılmak ister misiniz? Kayıt Ol'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Dark fallback
    },
    gradientBg: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0
    },
    content: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },

    // Intro Section
    introSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20
    },
    verseContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    arabicVerse: {
        fontSize: 32, // Large for Arabic details
        fontWeight: 'bold',
        color: '#FFD700', // Gold
        marginBottom: 8,
        textAlign: 'center',
        // fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif' // Try to use a better font if available
    },
    turkishMeal: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        fontStyle: 'italic',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4
    },
    verseSource: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1
    },

    quoteBanner: {
        width: '100%',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    quoteText: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
    },
    quoteAuthor: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 8,
        fontStyle: 'italic',
    },

    // Auth Box
    authBox: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500'
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56 // Fixed height for consistency
    },
    inputIcon: {
        marginRight: 12
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        height: '100%'
    },
    eyeIcon: {
        padding: 4,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    switchButton: {
        marginTop: 16,
        alignItems: 'center',
        padding: 8,
    },
    switchText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '500'
    }
});
