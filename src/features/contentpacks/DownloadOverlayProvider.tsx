/**
 * DownloadOverlayProvider - Global Content Pack Download Modal
 * 
 * Provides a global download overlay that can be triggered from anywhere
 * in the app via the useDownloadOverlay() hook.
 * 
 * Library Contract v1.1 Compliant: FROZEN paths untouched
 * 
 * @packageDocumentation
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentPackService } from '@/services/ContentPackService';
import { theme } from '@/config/theme';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ShowDownloadArgs {
    bookId: string;
    bookTitle: string;
    downloadUrl: string;
}

interface DownloadOverlayContextValue {
    showDownload: (args: ShowDownloadArgs) => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const DownloadOverlayContext = createContext<DownloadOverlayContextValue | null>(null);

export function useDownloadOverlay(): DownloadOverlayContextValue {
    const ctx = useContext(DownloadOverlayContext);
    if (!ctx) {
        throw new Error('useDownloadOverlay must be used within DownloadOverlayProvider');
    }
    return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const DownloadOverlayProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    // Modal state
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'downloading' | 'verifying' | 'installing' | 'completed' | 'failed'>('idle');
    const [error, setError] = useState<string | null>(null);

    // Promise resolver for async flow
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    // Retry state
    const [currentArgs, setCurrentArgs] = useState<ShowDownloadArgs | null>(null);

    /**
     * Show download overlay and start download
     * Returns true if download successful, false otherwise
     */
    const showDownload = useCallback(async (args: ShowDownloadArgs): Promise<boolean> => {
        return new Promise((resolve) => {
            setCurrentArgs(args);
            setTitle(args.bookTitle);
            setProgress(0);
            setStatus('downloading');
            setError(null);
            setVisible(true);
            setResolver(() => resolve);

            // Start download
            ContentPackService.downloadPack(args.bookId, args.downloadUrl, (p) => {
                setProgress(p.percentage);
                setStatus(p.status as typeof status);
                if (p.error) setError(p.error);

                // Auto-close on success
                if (p.status === 'completed') {
                    setTimeout(() => {
                        setVisible(false);
                        resolve(true);
                    }, 500);
                }
            }).then((ok) => {
                if (!ok) {
                    setStatus('failed');
                }
            });
        });
    }, []);

    // Retry download
    const handleRetry = useCallback(() => {
        if (currentArgs) {
            setProgress(0);
            setStatus('downloading');
            setError(null);

            ContentPackService.downloadPack(currentArgs.bookId, currentArgs.downloadUrl, (p) => {
                setProgress(p.percentage);
                setStatus(p.status as typeof status);
                if (p.error) setError(p.error);

                if (p.status === 'completed') {
                    setTimeout(() => {
                        setVisible(false);
                        resolver?.(true);
                    }, 500);
                }
            }).then((ok) => {
                if (!ok) {
                    setStatus('failed');
                }
            });
        }
    }, [currentArgs, resolver]);

    // Close modal (fail)
    const handleClose = useCallback(() => {
        setVisible(false);
        resolver?.(false);
    }, [resolver]);

    // Context value
    const value = useMemo(() => ({ showDownload }), [showDownload]);

    return (
        <DownloadOverlayContext.Provider value={value}>
            {children}

            {/* Global Download Modal */}
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={handleClose}
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        {/* Title */}
                        <Text style={styles.title}>{title}</Text>

                        {/* Downloading */}
                        {status === 'downloading' && (
                            <>
                                <Text style={styles.statusText}>İndiriliyor...</Text>
                                <View style={styles.progressContainer}>
                                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                                </View>
                                <Text style={styles.progressText}>%{Math.round(progress)}</Text>
                            </>
                        )}

                        {/* Verifying */}
                        {status === 'verifying' && (
                            <>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={styles.statusText}>Doğrulanıyor...</Text>
                            </>
                        )}

                        {/* Installing */}
                        {status === 'installing' && (
                            <>
                                <ActivityIndicator size="large" color={theme.colors.success} />
                                <Text style={styles.statusText}>Kuruluyor...</Text>
                            </>
                        )}

                        {/* Completed */}
                        {status === 'completed' && (
                            <>
                                <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
                                <Text style={styles.successText}>Hazır!</Text>
                            </>
                        )}

                        {/* Failed */}
                        {status === 'failed' && (
                            <>
                                <Ionicons name="alert-circle" size={64} color="#EF4444" />
                                <Text style={styles.errorText}>{error || 'İndirme başarısız'}</Text>
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                                        <Ionicons name="refresh" size={20} color="#FFF" />
                                        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                                        <Text style={styles.cancelButtonText}>Kapat</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Cancel link during download */}
                        {(status === 'downloading' || status === 'verifying' || status === 'installing') && (
                            <TouchableOpacity style={styles.cancelLink} onPress={handleClose}>
                                <Text style={styles.cancelLinkText}>İptal</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </DownloadOverlayContext.Provider>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modal: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 16,
        textAlign: 'center'
    },
    statusText: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 12
    },
    progressContainer: {
        width: '100%',
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 16
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 4
    },
    progressText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginTop: 12
    },
    successText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.success,
        marginTop: 12
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8
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
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#F1F5F9'
    },
    cancelButtonText: {
        color: '#64748B',
        fontWeight: '600'
    },
    cancelLink: {
        marginTop: 24
    },
    cancelLinkText: {
        color: '#94A3B8',
        fontSize: 14
    }
});

export default DownloadOverlayProvider;
