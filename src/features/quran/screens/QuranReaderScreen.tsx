import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, useWindowDimensions } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { QuranMeta } from '../services/QuranMeta';
import { useQuranStore } from '../store/useQuranStore';
import { theme } from '@/config/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QuranVerticalList } from '../components/QuranVerticalList';
import { lastReadService } from '@/services/lastReadService';

import { QuranPackService } from '../services/QuranPackService';

export const QuranReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { initialPage } = route.params || { initialPage: 1 };
    const { status, downloadProgress, detailedStatus, lastError, setLastPageNumber, totalPages } = useQuranStore();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
    const [headerTitle, setHeaderTitle] = useState('');

    const isInstalled = status === 'INSTALLED';
    const isDownloading = status === 'DOWNLOADING' || status === 'PARTIAL';

    // Unlock Orientation for Reading
    useFocusEffect(
        useCallback(() => {
            ScreenOrientation.unlockAsync();
            return () => {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            };
        }, [])
    );

    const handlePageChanged = useCallback((page: number) => {
        const surahName = QuranMeta.getSurahNameByPage(page);
        setHeaderTitle(`${surahName} • S. ${page}`);
        setCurrentPage(page);
        setLastPageNumber(page);

        // Record to universal last read manager
        lastReadService.recordLastRead({
            id: 'quran_reader',
            type: 'quran_page',
            title: "Kur'an-ı Kerim (Hat)",
            subtitle: `${surahName} • Sayfa ${page}`,
            screenName: 'QuranReaderScreen',
            params: { initialPage: page },
        }).catch(() => { });
    }, [setLastPageNumber]);

    // Initial Setup
    useEffect(() => {
        const page = initialPage || 1;
        setHeaderTitle(`${QuranMeta.getSurahNameByPage(page)} • S. ${page}`);
        setCurrentPage(page);
    }, [initialPage]);

    const handleStartDownload = async () => {
        try {
            await QuranPackService.downloadAndInstall();
        } catch (e: any) {
            console.error('[QuranReader] Download error:', e);
        }
    };

    const currentSurahId = (QuranMeta as any).getSurahIdByPage ? (QuranMeta as any).getSurahIdByPage(currentPage) : 1;

    // ── If pack is not installed yet, show high quality download UI ──
    if (!isInstalled) {
        return (
            <GestureHandlerRootView style={[styles.downloadContainer, { backgroundColor: '#FAF6EE' }]}>
                <StatusBar barStyle="dark-content" />

                {/* Back Button */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.downloadBackBtn}>
                    <Ionicons name="arrow-back" size={22} color="#334155" />
                </TouchableOpacity>

                <View style={styles.downloadCard}>
                    <View style={styles.downloadIconCircle}>
                        <Ionicons name="cloud-download-outline" size={44} color={theme.colors.primary} />
                    </View>

                    <Text style={styles.downloadTitle}>Ahmed Hüsrev Hattı</Text>
                    <Text style={styles.downloadSubtitle}>Tevafuklu Kur'an-ı Kerim Mushafı</Text>
                    <Text style={styles.downloadDescription}>
                        616 sayfa yüksek çözünürlüklü Hüsrev Hattı sayfaları çevrimdışı kullanım için bir kez cihazınıza indirilir.
                    </Text>

                    {isDownloading ? (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: `${Math.round(downloadProgress * 100)}%` }]} />
                            </View>
                            <Text style={styles.progressPercentText}>%{Math.round(downloadProgress * 100)}</Text>
                            <Text style={styles.progressStatusText}>{detailedStatus || 'İndiriliyor...'}</Text>
                        </View>
                    ) : (
                        <View style={styles.buttonStack}>
                            <TouchableOpacity
                                style={styles.startDownloadBtn}
                                onPress={handleStartDownload}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="download" size={20} color="#ffffff" />
                                <Text style={styles.startDownloadBtnText}>
                                    {lastError ? 'Tekrar Dene (İndir)' : 'Hüsrev Hattı İndir (171 MB)'}
                                </Text>
                            </TouchableOpacity>

                            {lastError && (
                                <Text style={styles.downloadErrorText}>Hata: {lastError}</Text>
                            )}

                            <TouchableOpacity
                                style={styles.readTextBtn}
                                onPress={() => navigation.navigate('QuranTextReaderScreen', { surahId: currentSurahId || 1 })}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.readTextBtnText}>Şimdilik Metin / Mealli Oku</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FAF6EE' }}>
            <StatusBar hidden />

            {/* Header - Auto-Hide */}
            {!isLandscape && (
                <View style={styles.overlayHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={20} color="#334155" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('QuranTextMenuScreen')}
                        style={styles.headerTitleContainer}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.headerTitleText}>{headerTitle}</Text>
                        <Ionicons name="chevron-down" size={12} color="#8B7355" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <View style={styles.rightActions}>
                        {/* Switch to Text / Meal View */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('QuranTextReaderScreen', { surahId: currentSurahId || 1 })}
                            style={[styles.iconButton, { marginRight: 8 }]}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="book-open-page-variant" size={18} color="#047857" />
                        </TouchableOpacity>

                        {/* Open Menu / Index */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('QuranTextMenuScreen')}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="list" size={20} color="#334155" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Landscape Floating Back Button */}
            {isLandscape && (
                <TouchableOpacity
                    style={styles.floatingBack}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
            )}

            {/* Vertical List Component with 616 Husrev Hatti Pages */}
            <QuranVerticalList
                totalPages={totalPages || 616}
                initialPage={initialPage || 1}
                onPageChanged={handlePageChanged}
                width={width}
                height={height}
            />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    overlayHeader: {
        position: 'absolute',
        top: 36,
        left: 16,
        right: 16,
        zIndex: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        width: 38,
        height: 38,
        backgroundColor: 'rgba(255,255,255,0.94)',
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E2D9C8',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.94)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        borderWidth: 1,
        borderColor: '#E2D9C8',
    },
    headerTitleText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#334155',
    },
    floatingBack: {
        position: 'absolute',
        top: 30,
        left: 20,
        zIndex: 50,
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Download Screen Styles
    downloadContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    downloadBackBtn: {
        position: 'absolute',
        top: 48,
        left: 20,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    downloadCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2D9C8',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    downloadIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    downloadTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center',
    },
    downloadSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        marginTop: 2,
        marginBottom: 10,
        textAlign: 'center',
    },
    downloadDescription: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 20,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 8,
    },
    progressBarBackground: {
        width: '100%',
        height: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 5,
    },
    progressPercentText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    progressStatusText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
    },
    buttonStack: {
        width: '100%',
        gap: 12,
    },
    startDownloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 14,
        elevation: 2,
    },
    startDownloadBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    downloadErrorText: {
        fontSize: 12,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 4,
    },
    readTextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    readTextBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
