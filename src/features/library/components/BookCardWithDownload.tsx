/**
 * BookCardWithDownload Component
 * 
 * Enhanced book card that handles bundled vs downloadable content.
 * Shows download button for downloadable books, progress during download.
 * 
 * @packageDocumentation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { BookEntry } from '@/config/booksRegistry';
import { useContentPack } from '@/hooks/useContentPack';

interface BookCardWithDownloadProps {
    book: BookEntry;
    onOpen: () => void;
}

export const BookCardWithDownload: React.FC<BookCardWithDownloadProps> = ({ book, onOpen }) => {
    const {
        status,
        isLoading,
        isReady,
        isDownloading,
        downloadProgress,
        downloadStatus,
        estimatedSizeMb,
        error,
        download,
        retry
    } = useContentPack(book.id);

    // Handle card press
    const handlePress = async () => {
        if (isReady) {
            onOpen();
        } else if (!isDownloading) {
            await download();
        }
    };

    // Render action button based on state
    const renderAction = () => {
        if (isLoading) {
            return <ActivityIndicator size="small" color={theme.colors.primary} />;
        }

        if (error) {
            return (
                <TouchableOpacity style={styles.retryButton} onPress={retry}>
                    <Ionicons name="refresh" size={16} color="#EF4444" />
                    <Text style={styles.retryText}>Tekrar</Text>
                </TouchableOpacity>
            );
        }

        if (isDownloading) {
            return (
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
                    <Text style={styles.progressText}>
                        {downloadStatus === 'downloading' ? `%${Math.round(downloadProgress)}` :
                            downloadStatus === 'verifying' ? 'Doğrulanıyor...' :
                                downloadStatus === 'installing' ? 'Kuruluyor...' : ''}
                    </Text>
                </View>
            );
        }

        if (status === 'bundled' || status === 'downloaded') {
            return (
                <View style={styles.readyBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.readyText}>Hazır</Text>
                </View>
            );
        }

        // Not downloaded
        return (
            <View style={styles.downloadBadge}>
                <Ionicons name="download-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.downloadText}>
                    {estimatedSizeMb ? `${estimatedSizeMb} MB` : 'İndir'}
                </Text>
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                isDownloading && styles.cardDownloading
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={isDownloading}
        >
            <View style={styles.iconContainer}>
                <Ionicons
                    name={book.icon as any}
                    size={28}
                    color={theme.colors.primary}
                />
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{book.title}</Text>
                {renderAction()}
            </View>

            <Ionicons
                name={isReady ? "chevron-forward" : "download"}
                size={20}
                color="#CBD5E1"
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardDownloading: {
        backgroundColor: '#F8FAFC'
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    content: {
        flex: 1,
        marginRight: 8
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4
    },
    downloadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    downloadText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500'
    },
    readyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    readyText: {
        fontSize: 13,
        color: theme.colors.success,
        fontWeight: '500'
    },
    progressContainer: {
        height: 20,
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative'
    },
    progressBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: theme.colors.primary,
        borderRadius: 10
    },
    progressText: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1E293B'
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    retryText: {
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '500'
    }
});

export default BookCardWithDownload;
