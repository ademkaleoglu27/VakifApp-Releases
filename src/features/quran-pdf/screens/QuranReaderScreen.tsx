import React, { useRef, useState, useEffect, useCallback } from 'react';
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

// Stable source object to prevent re-renders
const PDF_SOURCE = { uri: LOCAL_FILE, cache: true };

// Memoized PDF Component to prevent re-renders when parent state (like page badge) changes
const StablePdfView = React.memo(({
    page,
    onLoadComplete,
    onPageChanged,
    onError,
    onScaleChanged
}: any) => {
    // Internal render counter for the isolated component
    const renderRef = useRef(0);
    renderRef.current++;
    console.log(`[PDF INTERNAL] Render #${renderRef.current} | PageProp: ${page}`);

    return (
        <Pdf
            source={PDF_SOURCE}
            page={page}
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
            onLoadComplete={onLoadComplete}
            onPageChanged={onPageChanged}
            onScaleChanged={onScaleChanged}
            onError={onError}
        />
    );
}, (prevProps, nextProps) => {
    // Custom comparison: Only re-render if 'page' prop changes.
    // Since 'source' is constant and callbacks are memoized, this is the main factor.
    return prevProps.page === nextProps.page;
});

// Custom hook for debouncing
const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    return useCallback((...args: any[]) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

export const QuranReaderScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // Diagnostic: Parent Render Count
    const renderRef = useRef(0);
    renderRef.current++;

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>((route.params?.page || 1));

    // Uncontrolled Page Prop: only set on mount.
    // We do NOT update this prop when the user swipes in the PDF.
    const initialPdfPage = useRef((route.params?.page || 1) + PAGE_OFFSET).current;

    console.log(`[READER PARENT] Render #${renderRef.current} | PageState: ${currentPage} | InitialPdfPage: ${initialPdfPage}`);

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

    // Debounced State Commit
    const commitPageChange = useCallback((quranPage: number) => {
        console.log(`[PDF STATE COMMIT] Updating State to: ${quranPage}`);
        setCurrentPage(quranPage);
        AsyncStorage.setItem(STORAGE_KEY, quranPage.toString());
    }, []);

    const debouncedPageChange = useDebounce(commitPageChange, 200);

    // Callbacks
    const handlePageChange = useCallback((pdfPage: number, numberOfPages: number) => {
        // Calculate logical page
        const quranPage = Math.max(1, pdfPage - PAGE_OFFSET);

        // Log every raw event (spammy)
        // console.log(`[PDF RAW EVENT] PageChanged: ${pdfPage} -> QPage: ${quranPage}`);

        // Use debounce to update UI state
        debouncedPageChange(quranPage);
    }, [debouncedPageChange]);

    const handleLoadComplete = useCallback((numberOfPages: number) => {
        setLoading(false);
        console.log(`[PDF EVENT] Load Complete: ${numberOfPages} pages`);
    }, []);

    const handleError = useCallback((error: any) => {
        console.log(error);
        setError('PDF görüntülenemedi. Dosya bozuk olabilir.');
        setLoading(false);
    }, []);

    const handleScaleChanged = useCallback((scale: number) => {
        // Log only, no state update
    }, []);

    // Other Actions
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
                <StablePdfView
                    page={initialPdfPage} // UNCONTROLLED: Only initial page is passed
                    onLoadComplete={handleLoadComplete}
                    onPageChanged={handlePageChange}
                    onScaleChanged={handleScaleChanged}
                    onError={handleError}
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
