/**
 * RequireContent - Reader Route Guard (ContentGate)
 * 
 * Wraps reader screens to ensure content is available before rendering.
 * If content pack is not downloaded, triggers download overlay.
 * Displays CP_* error codes for diagnostic purposes.
 * 
 * Usage:
 *   <RequireContent bookId="mektubat" bookTitle="Mektubat">
 *     <ActualReaderScreen />
 *   </RequireContent>
 * 
 * Library Contract v1.1 Compliant: FROZEN paths untouched
 * 
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ContentPackResolver } from '@/services/ContentPackResolver';
import { CONTENT_PACK_CONFIG } from '@/config/booksRegistry';
import { ContentPackService } from '@/services/ContentPackService';
import { theme } from '@/config/theme';
import { canonicalizeBookId } from '@/services/bookId';

interface RequireContentProps {
    bookId: string;
    bookTitle: string;
    children: React.ReactNode;
}

export const RequireContent: React.FC<RequireContentProps> = ({
    bookId,
    bookTitle,
    children
}) => {
    const [ready, setReady] = useState(false);
    const [checking, setChecking] = useState(true);
    const [failed, setFailed] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [dlProgress, setDlProgress] = useState(0);
    const [dlStatus, setDlStatus] = useState<string>('Hazırlanıyor...');
    const navigation = useNavigation();

    const checkContent = async () => {
        setChecking(true);
        setFailed(false);
        setErrorCode(null);
        setErrorMessage(null);

        // UX: Add minimum delay to prevent flicker (STEP 6)
        const minDelay = new Promise(resolve => setTimeout(resolve, 500));

        try {
            // STEP 1: Log Diagnosis
            console.log('[RequireContent] Checking content for:', bookId);

            // Check if content is available
            const resolution = await ContentPackResolver.resolve(bookId);

            // Wait for delay
            await minDelay;

            console.log(`[RequireContent] Resolution status: ${resolution.status} (code: ${resolution.errorCode})`);

            // Handle resolver errors (e.g., bundled asset missing)
            if (resolution.status === 'error') {
                console.warn(`[RequireContent] Resolver error: ${resolution.errorCode}`);
                console.log(`[RequireContent] Download Trigger Reason: RESOLVER_ERROR_${resolution.errorCode}`);

                setFailed(true);
                setErrorCode(resolution.errorCode || 'UNKNOWN');
                setErrorMessage(resolution.errorMessage || 'İçerik bulunamadı');
                setChecking(false);
                return;
            }

            // Bundled or already downloaded - ready to render
            if (resolution.status === 'bundled' || resolution.status === 'downloaded') {
                console.log('[RequireContent] Content READY. Opening reader.');
                setReady(true);
                setChecking(false);
                return;
            }

            // Need to download - get config
            const cid = canonicalizeBookId(bookId);
            const config = CONTENT_PACK_CONFIG[cid];

            if (!config?.downloadUrl) {
                console.warn(`[RequireContent] No download URL for ${bookId} (canonical: ${cid})`);
                console.log('[RequireContent] Download Trigger Reason: NO_DOWNLOAD_URL');

                setFailed(true);
                setErrorCode('CP_NO_DOWNLOAD_URL');
                setErrorMessage(`${bookId} için indirme URL'si bulunamadı`);
                setChecking(false);
                return;
            }

            // Trigger download inline
            console.log('[RequireContent] Download Trigger Reason: NOT_DOWNLOADED (Starting download...)');

            setChecking(false);
            setDownloading(true);
            setDlProgress(0);
            setDlStatus('İndiriliyor...');

            const success = await ContentPackService.downloadPack(cid, config.downloadUrl, (p) => {
                setDlProgress(p.percentage);
                if (p.status === 'downloading') setDlStatus('İndiriliyor...');
                if (p.status === 'verifying') setDlStatus('Doğrulanıyor...');
                if (p.status === 'extracting') setDlStatus('Dosyalar açılıyor...');
                if (p.status === 'installing') setDlStatus('Kuruluyor...');
                if (p.status === 'completed') setDlStatus('Tamamlandı!');
            });

            if (success) {
                console.log('[RequireContent] Download SUCCESS. State should now be READY.');
                setTimeout(() => {
                    setDownloading(false);
                    setReady(true);
                }, 500);
            } else {
                console.log('[RequireContent] Download FAILED or CANCELLED.');
                setDownloading(false);
                setFailed(true);
                setErrorCode('CP_DOWNLOAD_FAILED');
                setErrorMessage('İndirme başarısız oldu');
            }
        } catch (error: any) {
            console.error('[RequireContent] Error:', error);
            setFailed(true);
            setErrorCode('CP_UNKNOWN_ERROR');
            setErrorMessage(error.message || 'Bilinmeyen hata');
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            if (!mounted) return;
            await checkContent();
        };

        run();

        return () => { mounted = false; };
    }, [bookId, bookTitle]);

    // Retry handler
    const handleRetry = () => {
        checkContent();
    };

    // Go back handler
    const handleGoBack = () => {
        navigation.goBack();
    };

    // Loading state
    if (checking) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>İçerik kontrol ediliyor...</Text>
            </View>
        );
    }

    // Failed state
    if (failed) {
        return (
            <View style={styles.container}>
                <Ionicons name="alert-circle" size={64} color="#EF4444" />
                <Text style={styles.failedTitle}>İçerik yüklenemedi</Text>
                {errorCode && (
                    <View style={styles.errorCodeContainer}>
                        <Text style={styles.errorCode}>Hata: {errorCode}</Text>
                    </View>
                )}
                <Text style={styles.failedSubtext}>{errorMessage || 'Lütfen tekrar deneyin'}</Text>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                        <Ionicons name="refresh" size={20} color="#FFF" />
                        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <Text style={styles.backButtonText}>Geri Dön</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Ready - render children
    if (ready) {
        return <>{children}</>;
    }

    // Downloading state
    if (downloading) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>{bookTitle}</Text>

                <View style={styles.progressCard}>
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.statusText}>{dlStatus}</Text>

                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${dlProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>%{Math.round(dlProgress)}</Text>

                    <View style={styles.warningContainer}>
                        <Ionicons name="information-circle" size={20} color="#64748B" />
                        <Text style={styles.warningText}>
                            İzleme deneyimi için kitap içeriği hazırlanıyor. Lütfen işlem tamamlanana kadar bu sayfada kalın.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    // Fallback 
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>İçerik hazırlanıyor...</Text>
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FBF8F4',
        padding: 24
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748B'
    },
    failedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 16
    },
    errorCodeContainer: {
        marginTop: 8,
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6
    },
    errorCode: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#DC2626'
    },
    failedSubtext: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center'
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12
    },
    retryButtonText: {
        color: '#FFF',
        fontWeight: 'bold'
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#F1F5F9'
    },
    backButtonText: {
        color: '#64748B',
        fontWeight: '600'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 24,
        textAlign: 'center'
    },
    progressCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 16
    },
    progressContainer: {
        width: '100%',
        height: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 5,
        overflow: 'hidden'
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 5
    },
    progressText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginTop: 12
    },
    warningContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        alignItems: 'flex-start',
        gap: 12
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18
    }
});

export default RequireContent;
