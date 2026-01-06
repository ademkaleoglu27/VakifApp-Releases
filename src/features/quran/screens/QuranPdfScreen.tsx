import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumHeader } from '@/components/PremiumHeader';
import { theme } from '@/config/theme';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const QuranPdfScreen = () => {
    const insets = useSafeAreaInsets();
    const route = useRoute<any>();
    const initialPage = route.params?.page || 1;

    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const destPath = `${FileSystem.cacheDirectory}quran_v1.pdf`;
                const info = await FileSystem.getInfoAsync(destPath);

                // 1. Önce cache'e bak (Hızlı Açılış)
                if (info.exists) {
                    console.log('PDF found in cache, loading immediately.');
                    setPdfUri(destPath);
                    return;
                }

                // 2. Cache'de yoksa Asset'ten yükle (İlk Açılış)
                console.log('PDF not in cache, preparing...');

                // FIXME: quran.pdf asset is missing in project. 
                // Using a placeholder or throwing handled error to prevent crash.
                // const asset = Asset.fromModule(require('../../../../assets/quran.pdf'));
                // await asset.downloadAsync();

                throw new Error("Kuran PDF dosyası (assets/quran.pdf) bulunamadı.");

                /* 
                if (asset.localUri) {
                    // ...
                } 
                */

                /*
                if (asset.localUri) {
                    // Eğer asset.localUri varsa oradan kopyala veya direkt kullan
                    // Cache'e kopyalamak okuma performansını artırabilir
                    await FileSystem.copyAsync({
                        from: asset.localUri,
                        to: destPath
                    });
                    setPdfUri(destPath);
                } else if (asset.uri) {
                    await FileSystem.downloadAsync(asset.uri, destPath);
                    setPdfUri(destPath);
                }
                */
            } catch (err) {
                console.error('PDF Load Error:', err);
                setError('Dosya yüklenirken hata oluştu: ' + (err as any).message);
            }
        };

        loadPdf();
    }, []);

    if (error) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <PremiumHeader title="Kuran-ı Kerim" subtitle="Tevafuklu Hat" backButton={true} />
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <PremiumHeader
                title="Kuran-ı Kerim"
                subtitle="Tevafuklu Hat"
                backButton={true}
            />

            {pdfUri ? (
                <Pdf
                    source={{ uri: pdfUri, cache: true }}
                    page={initialPage}
                    onLoadComplete={(numberOfPages, filePath) => {
                        console.log(`Number of pages: ${numberOfPages}`);
                    }}
                    onPageChanged={(page, numberOfPages) => {
                        console.log(`Current page: ${page}`);
                        AsyncStorage.setItem('q_last_page', page.toString());
                    }}
                    onError={(error) => {
                        console.log('PDF Error:', error);
                        setError('PDF Okuma Hatası: ' + error);
                    }}
                    onPressLink={(uri) => {
                        console.log(`Link pressed: ${uri}`);
                    }}
                    style={styles.pdf}
                    horizontal={false}
                    enablePaging={false}
                    minScale={1.0}
                    maxScale={4.0}
                    spacing={10}
                    fitPolicy={0}
                    enableAntialiasing={true}
                    onLoadProgress={(percent) => {
                        console.log(`Loading: ${percent * 100}%`);
                    }}
                    renderActivityIndicator={(progress) => (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.loadingText}>Yükleniyor... %{Math.round(progress * 100)}</Text>
                        </View>
                    )}
                />
            ) : (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Dosya Hazırlanıyor...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        backgroundColor: '#f8fafc',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    errorText: {
        marginTop: 10,
        color: theme.colors.error,
        textAlign: 'center',
    }
});
