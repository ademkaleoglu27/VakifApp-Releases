/**
 * RequireContent - Reader Route Guard (ContentGate)
 * 
 * Wraps reader screens to ensure content is available before rendering.
 * If content pack is not downloaded, triggers download overlay.
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
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ContentPackResolver } from '@/services/ContentPackResolver';
import { CONTENT_PACK_CONFIG } from '@/config/booksRegistry';
import { useDownloadOverlay } from './DownloadOverlayProvider';
import { theme } from '@/config/theme';

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
    const { showDownload } = useDownloadOverlay();
    const navigation = useNavigation();

    useEffect(() => {
        let mounted = true;

        const checkContent = async () => {
            setChecking(true);
            setFailed(false);

            try {
                // Check if content is available
                const resolution = await ContentPackResolver.resolve(bookId);

                if (!mounted) return;

                // Bundled or already downloaded - ready to render
                if (resolution.status === 'bundled' || resolution.status === 'downloaded') {
                    setReady(true);
                    setChecking(false);
                    return;
                }

                // Need to download - get config
                const config = CONTENT_PACK_CONFIG[bookId];
                if (!config?.downloadUrl) {
                    console.warn(`[RequireContent] No download URL for ${bookId}`);
                    setFailed(true);
                    setChecking(false);
                    return;
                }

                // Trigger download overlay
                const success = await showDownload({
                    bookId,
                    bookTitle,
                    downloadUrl: config.downloadUrl
                });

                if (!mounted) return;

                if (success) {
                    setReady(true);
                } else {
                    setFailed(true);
                    // Optionally navigate back on failure
                    // navigation.goBack();
                }
            } catch (error) {
                console.error('[RequireContent] Error:', error);
                if (mounted) setFailed(true);
            } finally {
                if (mounted) setChecking(false);
            }
        };

        checkContent();

        return () => { mounted = false; };
    }, [bookId, bookTitle, showDownload]);

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
                <Text style={styles.failedText}>İçerik yüklenemedi</Text>
                <Text style={styles.failedSubtext}>Lütfen geri dönüp tekrar deneyin</Text>
            </View>
        );
    }

    // Ready - render children
    if (ready) {
        return <>{children}</>;
    }

    // Fallback (shouldn't reach here)
    return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FBF8F4'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748B'
    },
    failedText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B'
    },
    failedSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#64748B'
    }
});

export default RequireContent;
