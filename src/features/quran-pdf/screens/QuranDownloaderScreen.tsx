import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

// Verified Diyanet Official Link
const PDF_URL = 'https://dijital.diyanet.gov.tr/File/Download?path=kurani_kerim_bilgisayar_hatli.pdf&id=428';
const LOCAL_DIR = `${FileSystem.documentDirectory}quran/`;
const LOCAL_FILE = `${LOCAL_DIR}quran.pdf`;

export const QuranDownloaderScreen = () => {
    const navigation = useNavigation<any>();
    const [status, setStatus] = useState<'checking' | 'downloading' | 'ready' | 'error'>('checking');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        checkFile();
    }, []);

    const checkFile = async () => {
        try {
            const dirInfo = await FileSystem.getInfoAsync(LOCAL_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(LOCAL_DIR, { intermediates: true });
            }

            const fileInfo = await FileSystem.getInfoAsync(LOCAL_FILE);
            // Check if file exists AND has a reasonable size (> 1MB) to assume it's valid
            if (fileInfo.exists && fileInfo.size > 1000000) {
                setStatus('ready');
                navigateToMenu();
            } else {
                // If file exists but is small/empty, delete it to ensure fresh download
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(LOCAL_FILE);
                }
                setStatus('error'); // Ready to download
            }
        } catch (error) {
            console.error('File check error:', error);
            setStatus('error');
        }
    };

    const startDownload = async () => {
        setStatus('downloading');
        setProgress(0);

        // Ensure clean slate
        try {
            await FileSystem.deleteAsync(LOCAL_FILE, { idempotent: true });
        } catch (e) { }

        const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
            const p = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setProgress(p);
        };

        const downloadResumable = FileSystem.createDownloadResumable(
            PDF_URL,
            LOCAL_FILE,
            {},
            callback
        );

        try {
            const result = await downloadResumable.downloadAsync();
            if (result && result.uri) {
                // Verify size after download
                const info = await FileSystem.getInfoAsync(LOCAL_FILE);
                if (info.exists && info.size > 1000000) {
                    setStatus('ready');
                    navigateToMenu();
                } else {
                    setStatus('error');
                    Alert.alert('Hata', 'İndirilen dosya hasarlı. Lütfen tekrar deneyin.');
                }
            } else {
                setStatus('error');
                Alert.alert('İndirme Hatası', 'Dosya indirilemedi.');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
            Alert.alert('Hata', 'İnternet bağlantınızı kontrol edin.');
        }
    };

    const navigateToMenu = () => {
        navigation.replace('QuranMenuScreen');
    };

    if (status === 'checking') {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (status === 'ready') {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.text}>Menüye yönlendiriliyor...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>

            <View style={styles.content}>
                <Ionicons name="book-outline" size={100} color={theme.colors.primary} />
                <Text style={styles.title}>Kur'an-ı Kerim</Text>
                <Text style={styles.subtitle}>
                    Okumaya başlamak için Mushaf dosyasını indirmeniz gerekmektedir. (~100 MB)
                </Text>

                {status === 'downloading' ? (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>%{Math.round(progress * 100)} İndiriliyor...</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.downloadButton} onPress={startDownload}>
                        <Text style={styles.buttonText}>İndir ve Başla</Text>
                        <Ionicons name="cloud-download-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC'
    },
    backButton: {
        padding: 16,
        alignSelf: 'flex-start'
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 100
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 24,
        marginBottom: 12
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24
    },
    downloadButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 4,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600'
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center'
    },
    progressBarBg: {
        width: '100%',
        height: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 6,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 6
    },
    progressText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: '500'
    },
    text: {
        marginTop: 12,
        color: '#64748B'
    }
});
