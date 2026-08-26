import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { networkSyncWatcher } from '@/services/networkSyncWatcher';

export const OfflineSyncBadge: React.FC = () => {
    const [status, setStatus] = useState(networkSyncWatcher.getStatus());
    const [showOnlinePill, setShowOnlinePill] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        const unsubscribe = networkSyncWatcher.subscribe((newStatus) => {
            const wasOffline = !status.isInternetReachable;
            const isNowOnline = newStatus.isInternetReachable;

            setStatus(newStatus);

            // Show brief green success pill when transitioning from offline to online
            if (wasOffline && isNowOnline) {
                setShowOnlinePill(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setTimeout(() => {
                        Animated.timing(fadeAnim, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }).start(() => setShowOnlinePill(false));
                    }, 3500);
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const isOffline = !status.isInternetReachable;

    if (!isOffline && !showOnlinePill && !status.isSyncing) {
        return null;
    }

    return (
        <View style={styles.container}>
            {isOffline ? (
                <TouchableOpacity
                    style={styles.offlineBanner}
                    onPress={() => networkSyncWatcher.triggerInstantSync()}
                    activeOpacity={0.8}
                >
                    <Ionicons name="cloud-offline" size={16} color="#B45309" />
                    <Text style={styles.offlineText}>
                        Çevrimdışı Mod
                        {status.pendingOutboxCount > 0
                            ? ` • ${status.pendingOutboxCount} işlem kuyrukta`
                            : ' • Yerel hafıza aktif'}
                    </Text>
                    <Ionicons name="refresh" size={14} color="#B45309" />
                </TouchableOpacity>
            ) : status.isSyncing ? (
                <View style={styles.syncingBanner}>
                    <ActivityIndicator size="small" color="#0369A1" />
                    <Text style={styles.syncingText}>Bulut ile senkronize ediliyor...</Text>
                </View>
            ) : showOnlinePill ? (
                <Animated.View style={[styles.onlinePill, { opacity: fadeAnim }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                    <Text style={styles.onlineText}>Bağlantı Kuruldu • Eşitlendi ✓</Text>
                </Animated.View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        zIndex: 9999,
        elevation: 10,
        position: 'absolute',
        top: Platform.OS === 'android' ? 8 : 44,
        left: 16,
        right: 16,
        alignItems: 'center',
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    offlineText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400E',
    },
    syncingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F0F9FF',
        borderWidth: 1,
        borderColor: '#0284C7',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    syncingText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0369A1',
    },
    onlinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#16A34A',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    onlineText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#15803D',
    },
});
