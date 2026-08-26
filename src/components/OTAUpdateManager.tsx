import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, AppState, AppStateStatus, Platform, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { LinearGradient } from 'expo-linear-gradient';

export const OTAUpdateManager = () => {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const appState = useRef(AppState.currentState);
    const isChecking = useRef(false);

    useEffect(() => {
        // Only run OTA checks in production/release builds, not in development (Expo Go / Dev Client)
        if (__DEV__) return;

        // Check on initial load
        checkForUpdates();

        // Listen for AppState changes to check when the app comes to the foreground
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        // If app comes from background to active foreground, check for updates
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            if (__DEV__) return; // Skip in dev
            checkForUpdates();
        }
        appState.current = nextAppState;
    };

    const checkForUpdates = async () => {
        if (isChecking.current) return;
        isChecking.current = true;
        try {
            // Check if there is an update configured
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                // Download it quietly in the background
                await Updates.fetchUpdateAsync();
                setIsUpdateAvailable(true);
            }
        } catch (error) {
            // Silently fail if no internet or EAS is unreachable, we don't want to bother the user
            console.log("Error checking for updates:", error);
        } finally {
            isChecking.current = false;
        }
    };

    const handleUpdateNow = async () => {
        setIsUpdating(true);
        try {
            await Updates.reloadAsync();
        } catch (error) {
            console.error("Failed to reload app:", error);
            setIsUpdating(false);
            setIsUpdateAvailable(false);
        }
    };

    const handleLater = () => {
        setIsUpdateAvailable(false);
    };

    // If no update is downloaded and ready, render nothing
    if (!isUpdateAvailable) return null;

    return (
        <Modal visible={isUpdateAvailable} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>

                    {/* Header Graphics */}
                    <LinearGradient
                        colors={[theme.colors.primary, '#0f766e']}
                        style={styles.headerArea}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.iconCircle}>
                            <Ionicons name="rocket" size={32} color={theme.colors.primary} />
                        </View>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.contentArea}>
                        <Text style={styles.title}>Yeni Sürüm Hazır!</Text>
                        <Text style={styles.description}>
                            VakıfApp için yeni özellikler ve hata düzeltmeleri içeren bir güncelleme arka planda indirildi.
                        </Text>
                        <Text style={styles.descriptionBold}>
                            En iyi deneyim için uygulamayı şimdi yenilemenizi öneririz.
                        </Text>

                        {/* Actions */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.btnLater} onPress={handleLater} disabled={isUpdating}>
                                <Text style={styles.btnLaterText}>Daha Sonra</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnUpdate} onPress={handleUpdateNow} disabled={isUpdating}>
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.btnUpdateText}>Şimdi Yenile</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)', // Darker slate overlay
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden', // to clip the gradient
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 15,
    },
    headerArea: {
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginTop: 20,
    },
    contentArea: {
        padding: 24,
        paddingTop: 32, // make room for the overflowing icon
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    descriptionBold: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        textAlign: 'center',
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    btnLater: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    btnLaterText: {
        color: '#64748b',
        fontSize: 15,
        fontWeight: '600',
    },
    btnUpdate: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnUpdateText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
