import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, useWindowDimensions } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { QuranPackService } from '../services/QuranPackService';
import { QuranMeta } from '../services/QuranMeta';
import { useQuranStore } from '../store/useQuranStore';
import { theme } from '@/config/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QuranVerticalList } from '../components/QuranVerticalList';

export const QuranReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { initialPage } = route.params || { initialPage: 1 };
    const { setLastPageNumber, status, totalPages, lastError } = useQuranStore();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    // Phase 4: Unlock Orientation
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.unlockAsync();
            return () => {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            };
        }, [])
    );

    const [headerTitle, setHeaderTitle] = useState('');

    const handlePageChanged = useCallback((page: number) => {
        setHeaderTitle(`${QuranMeta.getSurahNameByPage(page)} - S. ${page}`);
        setLastPageNumber(page);
    }, [setLastPageNumber]);

    // Initial Setup
    useEffect(() => {
        const page = initialPage;
        setHeaderTitle(`${QuranMeta.getSurahNameByPage(page)} - S. ${page}`);
    }, [initialPage]);

    if (status === 'NOT_INSTALLED' || status === 'CORRUPT') {
        return (
            <View style={styles.centered}>
                <Ionicons name="cloud-download-outline" size={48} color={theme.colors.primary} />
                <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#334155' }}>Hat Kur'an Paketi</Text>
                {status === 'CORRUPT' && (
                    <Text style={{ color: '#EF4444', marginVertical: 8, textAlign: 'center', paddingHorizontal: 20 }}>
                        Hata: {lastError || 'Bilinmeyen Hata'}
                    </Text>
                )}
                <TouchableOpacity
                    onPress={() => QuranPackService.downloadAndInstall()}
                    style={{ marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>
                        {status === 'CORRUPT' ? 'Yeniden İndir' : 'İndir ve Kur'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
            <StatusBar hidden />

            {/* Header - Auto-Hide */}
            {!isLandscape && (
                <View style={styles.overlayHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={20} color="#334155" />
                    </TouchableOpacity>
                    <View style={[styles.headerTitleContainer, { opacity: 0.9 }]}>
                        <Text style={styles.headerTitleText}>{headerTitle}</Text>
                    </View>
                    <TouchableOpacity onPress={() => (navigation as any).navigate('QuranMenuScreen')} style={styles.iconButton}>
                        <Ionicons name="list" size={20} color="#334155" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Landscape Floating Back Button */}
            {isLandscape && (
                <TouchableOpacity
                    style={{
                        position: 'absolute', top: 40, left: 20, zIndex: 50,
                        width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: 20, justifyContent: 'center', alignItems: 'center'
                    }}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
            )}

            {/* Vertical List Component */}
            <QuranVerticalList
                totalPages={totalPages || 604}
                initialPage={initialPage}
                onPageChanged={handlePageChanged}
                width={width}
                height={height}
            />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    overlayHeader: {
        position: 'absolute', top: 40, left: 16, right: 16, zIndex: 50,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    iconButton: {
        width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 18, justifyContent: 'center', alignItems: 'center',
        shadowColor: "#000", shadowOpacity: 0.1, elevation: 2
    },
    headerTitleContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 12, elevation: 2
    },
    headerTitleText: { fontSize: 13, fontWeight: '700', color: '#334155' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
