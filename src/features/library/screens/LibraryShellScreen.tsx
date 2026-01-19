/**
 * LibraryShellScreen - Wrapper for LibraryHomeScreen
 * 
 * This wrapper implements the "download" functionality overlay without
 * modifying the FROZEN LibraryHomeScreen.tsx.
 * 
 * Strategy: 
 * - Render LibraryHomeScreen as-is
 * - Show download status modal when needed
 * - Handle content pack downloads in this layer
 * 
 * Library Contract v1.1 Compliant: NO FROZEN PATH MODIFICATIONS
 * 
 * @packageDocumentation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '@/config/theme';
import { LibraryHomeScreen } from './LibraryHomeScreen';
import { ContentPackService, DownloadProgress } from '@/services/ContentPackService';
import { ContentPackResolver, ContentStatus } from '@/services/ContentPackResolver';
import { CONTENT_PACK_CONFIG, getEnabledBooks } from '@/config/booksRegistry';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DownloadModalState {
    visible: boolean;
    bookId: string | null;
    bookTitle: string | null;
    progress: number;
    status: DownloadProgress['status'] | null;
    error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const LibraryShellScreen: React.FC = () => {
    const navigation = useNavigation<any>();

    // Download modal state
    const [downloadModal, setDownloadModal] = useState<DownloadModalState>({
        visible: false,
        bookId: null,
        bookTitle: null,
        progress: 0,
        status: null,
        error: null
    });

    // Content status cache (bookId -> status)
    const [contentStatusCache, setContentStatusCache] = useState<Record<string, ContentStatus>>({});

    // Initialize - clean staging and preload status
    useFocusEffect(
        useCallback(() => {
            initializeContentStatus();
        }, [])
    );

    const initializeContentStatus = async () => {
        try {
            // Clean any leftover staging directories
            await ContentPackService.cleanAllStaging();

            // Preload content status for all books
            const books = getEnabledBooks();
            const statuses: Record<string, ContentStatus> = {};

            for (const book of books) {
                const resolution = await ContentPackResolver.resolve(book.id);
                statuses[book.id] = resolution.status;
            }

            setContentStatusCache(statuses);
        } catch (e) {
            console.warn('[LibraryShell] Failed to initialize content status');
        }
    };

    // Handle download request (called when user tries to open downloadable book)
    const handleDownloadRequest = async (bookId: string, bookTitle: string) => {
        const config = CONTENT_PACK_CONFIG[bookId];

        if (!config || config.contentMode !== 'downloadable' || !config.downloadUrl) {
            console.warn(`[LibraryShell] Invalid download request for ${bookId}`);
            return;
        }

        // Show modal
        setDownloadModal({
            visible: true,
            bookId,
            bookTitle,
            progress: 0,
            status: 'downloading',
            error: null
        });

        // Start download
        const success = await ContentPackService.downloadPack(
            bookId,
            config.downloadUrl,
            (progress) => {
                setDownloadModal(prev => ({
                    ...prev,
                    progress: progress.percentage,
                    status: progress.status,
                    error: progress.error || null
                }));
            }
        );

        if (success) {
            // Update cache
            setContentStatusCache(prev => ({
                ...prev,
                [bookId]: 'downloaded'
            }));

            // Close modal after short delay
            setTimeout(() => {
                setDownloadModal(prev => ({ ...prev, visible: false }));
            }, 500);
        }
    };

    // Retry download
    const handleRetry = () => {
        if (downloadModal.bookId && downloadModal.bookTitle) {
            handleDownloadRequest(downloadModal.bookId, downloadModal.bookTitle);
        }
    };

    // Close modal
    const handleCloseModal = () => {
        setDownloadModal(prev => ({ ...prev, visible: false }));
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <View style={styles.container}>
            {/* Render the original FROZEN LibraryHomeScreen */}
            <LibraryHomeScreen />

            {/* Download Progress Modal (Overlay) */}
            <Modal
                visible={downloadModal.visible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <Text style={styles.modalTitle}>
                            {downloadModal.bookTitle || 'İçerik'}
                        </Text>

                        {/* Status */}
                        {downloadModal.status === 'downloading' && (
                            <>
                                <Text style={styles.modalSubtitle}>İndiriliyor...</Text>
                                <View style={styles.progressContainer}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            { width: `${downloadModal.progress}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    %{Math.round(downloadModal.progress)}
                                </Text>
                            </>
                        )}

                        {downloadModal.status === 'verifying' && (
                            <>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={styles.modalSubtitle}>Doğrulanıyor...</Text>
                            </>
                        )}

                        {downloadModal.status === 'installing' && (
                            <>
                                <ActivityIndicator size="large" color={theme.colors.success} />
                                <Text style={styles.modalSubtitle}>Kuruluyor...</Text>
                            </>
                        )}

                        {downloadModal.status === 'completed' && (
                            <>
                                <Ionicons
                                    name="checkmark-circle"
                                    size={64}
                                    color={theme.colors.success}
                                />
                                <Text style={styles.successText}>Hazır!</Text>
                            </>
                        )}

                        {downloadModal.status === 'failed' && (
                            <>
                                <Ionicons
                                    name="alert-circle"
                                    size={64}
                                    color="#EF4444"
                                />
                                <Text style={styles.errorText}>
                                    {downloadModal.error || 'İndirme başarısız'}
                                </Text>
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={handleRetry}
                                    >
                                        <Ionicons name="refresh" size={20} color="#FFF" />
                                        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={handleCloseModal}
                                    >
                                        <Text style={styles.cancelButtonText}>Kapat</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Cancel during download */}
                        {(downloadModal.status === 'downloading' ||
                            downloadModal.status === 'verifying' ||
                            downloadModal.status === 'installing') && (
                                <TouchableOpacity
                                    style={styles.cancelLink}
                                    onPress={handleCloseModal}
                                >
                                    <Text style={styles.cancelLinkText}>İptal</Text>
                                </TouchableOpacity>
                            )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 16,
        textAlign: 'center'
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 12,
        marginBottom: 8
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

export default LibraryShellScreen;
