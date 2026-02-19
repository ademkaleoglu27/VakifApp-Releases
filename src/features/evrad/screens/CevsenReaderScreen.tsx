
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCevsenStore } from '../stores/useCevsenStore';
import { CevsenPackService } from '../services/CevsenPackService';
import { GenericVerticalList } from '../../contentpacks/components/GenericVerticalList';

export const CevsenReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { initialPage, title } = route.params || { initialPage: 1, title: 'Büyük Cevşen' };

    // Bind to Cevsen Store
    const status = useCevsenStore(state => state.status);
    const totalPages = useCevsenStore(state => state.totalPages);
    const lastError = useCevsenStore(state => state.lastError);
    const downloadProgress = useCevsenStore(state => state.downloadProgress);
    const detailedStatus = useCevsenStore(state => state.detailedStatus);
    const setLastPageNumber = useCevsenStore(state => state.setLastPageNumber);

    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.unlockAsync();
            return () => {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            };
        }, [])
    );

    const [headerTitle, setHeaderTitle] = useState(title);

    const handlePageChanged = useCallback((page: number) => {
        setHeaderTitle(`${title} - S. ${page}`);
        setLastPageNumber(page);
    }, [title, setLastPageNumber]);

    // Download View
    if (status === 'NOT_INSTALLED' || status === 'CORRUPT' || status === 'DOWNLOADING') {
        const isDownloading = status === 'DOWNLOADING';
        return (
            <View style={styles.centered}>
                <Ionicons name="book-outline" size={64} color={theme.colors.primary} />
                <Text style={styles.dlTitle}>{title} Paketi</Text>

                {status === 'CORRUPT' && (
                    <Text style={styles.errorText}>Hata: {lastError}</Text>
                )}

                {isDownloading ? (
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.statusText}>{detailedStatus || 'İndiriliyor...'}</Text>
                        <Text style={styles.progressText}>%{(downloadProgress * 100).toFixed(0)}</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => CevsenPackService.downloadAndInstall()}
                        style={styles.dlBtn}
                    >
                        <Text style={styles.dlBtnText}>
                            {status === 'CORRUPT' ? 'Yeniden İndir' : 'İndir ve Başla (~15MB)'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
            <StatusBar hidden />

            {/* Header */}
            {!isLandscape && (
                <View style={styles.overlayHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={20} color="#334155" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitleText}>{headerTitle}</Text>
                    </View>
                    <TouchableOpacity onPress={() => (navigation as any).navigate('CevsenMenuScreen')} style={styles.iconButton}>
                        <Ionicons name="list" size={20} color="#334155" />
                    </TouchableOpacity>
                </View>
            )}

            {isLandscape && (
                <TouchableOpacity
                    style={styles.landscapeBack}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
            )}

            <GenericVerticalList
                totalPages={totalPages || 100}
                initialPage={initialPage}
                onPageChanged={handlePageChanged}
                width={width}
                height={height}
                service={CevsenPackService}
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
    landscapeBack: {
        position: 'absolute', top: 40, left: 20, zIndex: 50,
        width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20, justifyContent: 'center', alignItems: 'center'
    },
    headerTitleContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 12, elevation: 2
    },
    headerTitleText: { fontSize: 13, fontWeight: '700', color: '#334155' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    dlTitle: { marginTop: 16, fontSize: 18, fontWeight: 'bold', color: '#334155' },
    errorText: { color: '#EF4444', marginVertical: 8, textAlign: 'center' },
    statusText: { marginTop: 8, color: '#64748b' },
    progressText: { marginTop: 4, fontWeight: 'bold', fontSize: 18 },
    dlBtn: { marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    dlBtnText: { color: 'white', fontWeight: 'bold' }
});
