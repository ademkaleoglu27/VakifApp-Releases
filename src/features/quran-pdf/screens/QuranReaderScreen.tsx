import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Dimensions, SafeAreaView, ActivityIndicator, Text, Alert } from 'react-native';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_FILE = `${FileSystem.documentDirectory}quran/kuran_v2_lite.pdf`;
const STORAGE_KEY = '@quran_last_page';
const PAGE_OFFSET = 1; // +1 to account for the Cover Page
const { width, height } = Dimensions.get('window');

// Seamless background color matching standard Mushaf pages
const MUSHAF_BG = '#FFFBE8';

export const QuranReaderScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const initialPage = route.params?.page || 1;
    const pdfRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);

    // Ensure we handle the offset for display
    const targetPdfPage = (route.params?.page || 1) + PAGE_OFFSET;

    useEffect(() => {
        checkFile();
    }, []);

    const checkFile = async () => {
        const info = await FileSystem.getInfoAsync(LOCAL_FILE);
        if (!info.exists || info.size < 1000) {
            setError('Dosya bulunamadı veya hasarlı.');
            setLoading(false);
        }
    };

    const handlePageChange = (pdfPage: number) => {
        // Save the logical Quran page (PDF page - offset)
        const quranPage = Math.max(1, pdfPage - PAGE_OFFSET);
        setCurrentPage(quranPage);
        AsyncStorage.setItem(STORAGE_KEY, quranPage.toString());
    };

    const saveBookmark = () => {
        AsyncStorage.setItem(STORAGE_KEY, currentPage.toString());
        Alert.alert("Yer İşareti Eklendi", `${currentPage}. sayfa kaydedildi. Daha sonra 'Kaldığım Yerden Devam Et' diyerek dönebilirsiniz.`);
    };

    const redownload = async () => {
        try {
            await FileSystem.deleteAsync(LOCAL_FILE, { idempotent: true });
            navigation.replace('QuranDownloaderScreen');
        } catch (e) {
            Alert.alert('Hata', 'Dosya silinemedi.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {loading && !error && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1E293B" />
                    <Text style={styles.text}>Yükleniyor...</Text>
                </View>
            )}

            {error ? (
                <View style={styles.center}>
                    <Ionicons name="warning" size={64} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={redownload}>
                        <Text style={styles.retryText}>Tekrar İndir</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Pdf
                    ref={pdfRef}
                    source={{ uri: LOCAL_FILE, cache: true }}
                    page={targetPdfPage} // Use offset page
                    style={styles.pdf}
                    horizontal={true}
                    enablePaging={true}
                    enableRTL={false} // Stability Mode
                    enableAntialiasing={true} // Re-enabled to prevent blank page issues
                    minScale={1.0}
                    maxScale={4.0}
                    spacing={0}
                    fitPolicy={0}
                    trustAllCerts={false}
                    onLoadComplete={(numberOfPages) => {
                        setLoading(false);
                        console.log(`PDF Loaded: ${numberOfPages} pages`);
                    }}
                    onPageChanged={(page) => handlePageChange(page)}
                    onError={(error) => {
                        console.log(error);
                        setError('PDF görüntülenemedi. Dosya bozuk olabilir.');
                        setLoading(false);
                    }}
                />
            )}

            {/* Custom Floating Header */}
            <SafeAreaView style={styles.floatingHeader} pointerEvents="box-none">
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.circleBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#57534E" />
                    </TouchableOpacity>

                    <View style={styles.rightButtons}>
                        <View style={styles.pageBadge}>
                            <Text style={styles.pageText}>Sayfa {currentPage}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.circleBtn, styles.bookmarkBtn]}
                            onPress={saveBookmark}
                        >
                            <Ionicons name="bookmark" size={22} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MUSHAF_BG // Seamless Cream Background
    },
    center: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    text: {
        color: '#57534E',
        marginTop: 10
    },
    errorText: {
        color: '#EF4444',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 16
    },
    retryBtn: {
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8
    },
    retryText: {
        color: '#FFF',
        fontWeight: 'bold'
    },
    pdf: {
        flex: 1,
        width: width,
        height: height,
        backgroundColor: MUSHAF_BG // Match container
    },
    floatingHeader: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        zIndex: 20,
        paddingHorizontal: 20
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 251, 232, 0.9)', // Cream with opacity
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: '#E7E5E4'
    },
    bookmarkBtn: {
        backgroundColor: '#FEF2F2', // Light Red tint for bookmark
        borderColor: '#FECACA'
    },
    pageBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
    },
    pageText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12
    }
});
