import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentPackService } from '../../../services/ContentPackService';
import { QuranPackService } from '../../../services/quran/QuranPackService';
import { FeatureFlags } from '../../../config/featureFlags';
import { useDownloadOverlay } from '../../contentpacks/DownloadOverlayProvider';
import { CONTENT_PACK_CONFIG } from '../../../config/booksRegistry';

interface Props {
    onReady: () => void;
}

export const QuranDownloadGate: React.FC<Props> = ({ onReady }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { showDownload } = useDownloadOverlay();

    const bookId = 'quran_v1';
    const config = CONTENT_PACK_CONFIG[bookId];

    const checkStatus = async () => {
        setIsChecking(true);
        if (FeatureFlags.QURAN_OFFLINE_PACK_ENABLED) {
            const installed = await QuranPackService.isInstalled();
            setIsDownloaded(installed);
            if (installed) onReady();
        } else {
            const downloaded = await ContentPackService.isDownloaded(bookId);
            setIsDownloaded(downloaded);
            if (downloaded) onReady();
        }
        setIsChecking(false);
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleDownload = async () => {
        if (FeatureFlags.QURAN_OFFLINE_PACK_ENABLED) {
            setDownloading(true);
            const success = await QuranPackService.install((p) => {
                setProgress(p.percentage);
            });
            setDownloading(false);
            if (success) {
                setIsDownloaded(true);
                onReady();
            }
            return;
        }

        if (!config || !config.downloadUrl) return;

        const success = await showDownload({
            bookId,
            bookTitle: "Kur'an-ı Kerim (Görsel Paket)",
            downloadUrl: config.downloadUrl
        });

        if (success) {
            setIsDownloaded(true);
            onReady();
        }
    };


    if (isChecking) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4B5563" />
            </View>
        );
    }

    if (downloading) {

        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4B5563" />
                <Text style={styles.title}>İndiriliyor...</Text>
                <Text style={styles.description}>
                    Lütfen bekleyin, Kur'an sayfaları indiriliyor ve kuruluyor.
                </Text>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.note}>%{(progress * 100).toFixed(0)} tamamlandı</Text>
            </View>
        );
    }

    if (isDownloaded) return null;

    return (
        <View style={styles.container}>
            <Ionicons name="cloud-download-outline" size={80} color="#94A3B8" />
            <Text style={styles.title}>Kur'an Okuyucu</Text>
            <Text style={styles.description}>
                Çevrimdışı ve hızlı erişim için Kur'an sayfalarının (yaklaşık 150 MB) indirilmesi gerekmektedir.
            </Text>

            <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
            >
                <Text style={styles.downloadButtonText}>İndir ve Başlat</Text>
            </TouchableOpacity>

            <Text style={styles.note}>Bir kez indirdikten sonra internet gerekmez.</Text>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 20,
    },
    description: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 24,
    },
    downloadButton: {
        backgroundColor: '#4B5563',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 32,
    },
    downloadButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    note: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 16,
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginTop: 24,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4B5563',
    }
});

