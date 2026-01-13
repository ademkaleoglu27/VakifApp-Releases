import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { reinstallContentDbAsset } from '../services/contentDb';

interface ContentIntegrityScreenProps {
    errorCode?: string;
    details?: any;
    diagnostics?: any;
    onRetry?: () => void;
    route?: {
        params: {
            errorCode: string;
            details?: any;
            diagnostics?: any;
            onRetry?: () => void;
        }
    }
}

export const ContentIntegrityScreen: React.FC<ContentIntegrityScreenProps> = (props) => {
    const params = props.route?.params || { errorCode: '', details: null, onRetry: undefined };
    const errorCode = props.errorCode || params.errorCode || 'UNKNOWN_ERROR';
    const details = props.details || params.details;
    const diagnostics = props.diagnostics || params.diagnostics;
    const onRetry = props.onRetry || params.onRetry;

    // Merge details and diagnostics for copy/display if needed, or keep separate
    // We will show diagnostics if available
    const displayDetails = diagnostics ? { ...details, diagnostics } : details;

    const copyDebugInfo = async () => {
        const info = JSON.stringify({ errorCode, details, diagnostics, ts: new Date().toISOString() }, null, 2);
        await Clipboard.setStringAsync(info);
        alert('Debug info copied to clipboard');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="alert-circle" size={80} color="#EF4444" />

                <Text style={styles.title}>İçerik Bütünlüğü Hatası</Text>

                <Text style={styles.message}>
                    Uygulama veritabanında kritik bir bozulma tespit edildi.
                    Güvenliğiniz için okuma ekranı kilitlendi.
                </Text>

                <View style={styles.errorBox}>
                    <Text style={styles.errorCode}>Hata Kodu: {errorCode || 'UNKNOWN_ERROR'}</Text>
                    {displayDetails && (
                        <Text style={styles.errorDetails}>
                            {JSON.stringify(displayDetails, null, 2)}
                        </Text>
                    )}
                </View>

                {onRetry && (
                    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                        <Text style={styles.retryText}>Otomatik Onarımı Dene</Text>
                    </TouchableOpacity>
                )}

                {/* Manual Reinstall Button - Only for critical content missing */}
                {(errorCode === 'ERR_SOZLER_MISSING' || errorCode === 'ERR_MAIN_SECTIONS_MISSING' || errorCode === 'ERR_DB_INTEGRITY_FAIL') && (
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: '#B91C1C', marginTop: 8 }]}
                        onPress={() => {
                            Alert.alert(
                                'İçeriği Sıfırla',
                                'Veritabanı tamamen silinip baştan yüklenecek. Kişisel verileriniz (notlar, işaretler) korunacaktır. Devam edilsin mi?',
                                [
                                    { text: 'İptal', style: 'cancel' },
                                    {
                                        text: 'Sıfırla ve Yükle',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                await reinstallContentDbAsset();
                                                Alert.alert('Başarılı', 'İçerik yeniden yüklendi. Uygulama yeniden başlatılıyor.', [
                                                    {
                                                        text: 'Tamam', onPress: async () => {
                                                            try {
                                                                const Updates = await import('expo-updates');
                                                                await Updates.reloadAsync();
                                                            } catch (e) {
                                                                // Fallback if Updates not available (dev client)
                                                            }
                                                            // Always attempt retry as fallback if reload didn't happen
                                                            if (onRetry) onRetry();
                                                        }
                                                    }
                                                ]);
                                            } catch (e) {
                                                Alert.alert('Hata', 'Yükleme başarısız oldu: ' + e);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Text style={styles.retryText}>İçeriği Yeniden Yükle (Manuel)</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.copyButton} onPress={copyDebugInfo}>
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                    <Text style={styles.copyText}>Hata Raporunu Kopyala</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.supportButton}
                    onPress={() => Linking.openURL('mailto:destek@vakifapp.com?subject=VakifApp Content Error')}
                >
                    <Text style={styles.supportText}>Destek Ekibiyle İletişime Geç</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEF2F2',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#7F1D1D',
        marginTop: 16,
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        color: '#991B1B',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorCode: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#B91C1C',
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    errorDetails: {
        fontSize: 12,
        color: '#7F1D1D',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    retryButton: {
        backgroundColor: '#DC2626',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    retryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 12,
    },
    copyText: {
        color: '#6B7280',
        marginLeft: 8,
        fontWeight: '500',
    },
    supportButton: {
        padding: 12,
    },
    supportText: {
        color: '#EF4444',
        fontWeight: '500',
        textDecorationLine: 'underline',
    }
});
