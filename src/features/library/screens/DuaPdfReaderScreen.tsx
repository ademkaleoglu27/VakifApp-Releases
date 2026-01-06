import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, Text, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { PremiumHeader } from '@/components/PremiumHeader';
import Pdf from 'react-native-pdf';
import { Asset } from 'expo-asset';

const { width, height } = Dimensions.get('window');

interface DuaPdfReaderRouteParams {
    title: string;
    pdfSource: any;
}

export const DuaPdfReaderScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { title, pdfSource } = route.params as DuaPdfReaderRouteParams;

    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const asset = Asset.fromModule(pdfSource);
                await asset.downloadAsync();
                if (asset.localUri) {
                    setPdfUri(asset.localUri);
                } else {
                    setError('PDF yüklenemedi');
                }
            } catch (err) {
                setError('PDF yüklenirken hata oluştu');
            } finally {
                setLoading(false);
            }
        };
        loadPdf();
    }, [pdfSource]);

    if (loading) {
        return (
            <View style={styles.container}>
                <PremiumHeader title={title} backButton />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0F766E" />
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
            </View>
        );
    }

    if (error || !pdfUri) {
        return (
            <View style={styles.container}>
                <PremiumHeader title={title} backButton />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || 'PDF bulunamadı'}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader title={title} backButton />

            <View style={styles.pdfContainer}>
                <Pdf
                    source={{ uri: pdfUri }}
                    style={styles.pdf}
                    enablePaging={false}
                    horizontal={false}
                    fitPolicy={2}
                    spacing={0}
                    enableAntialiasing={true}
                    scale={1.0}
                    minScale={1.0}
                    maxScale={3.0}
                    onError={(err) => {
                        Alert.alert('Hata', 'PDF görüntülenirken bir sorun oluştu.');
                    }}
                    renderActivityIndicator={() => (
                        <ActivityIndicator size="large" color="#0F766E" />
                    )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#64748b',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    pdfContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    pdf: {
        flex: 1,
        width: width,
        backgroundColor: '#fff',
    },
});
