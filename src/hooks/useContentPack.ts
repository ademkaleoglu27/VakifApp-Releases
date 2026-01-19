/**
 * useContentPack Hook
 * 
 * React hook for managing content pack downloads with state management.
 * 
 * @packageDocumentation
 */

import { useState, useEffect, useCallback } from 'react';
import { ContentPackService, DownloadProgress } from '@/services/ContentPackService';
import { ContentPackResolver, ContentStatus } from '@/services/ContentPackResolver';
import { CONTENT_PACK_CONFIG } from '@/config/booksRegistry';

export interface ContentPackState {
    status: ContentStatus;
    isLoading: boolean;
    downloadProgress: number;
    downloadStatus: DownloadProgress['status'] | null;
    estimatedSizeMb: number | null;
    error: string | null;
}

export function useContentPack(bookId: string) {
    const [state, setState] = useState<ContentPackState>({
        status: 'not_downloaded',
        isLoading: true,
        downloadProgress: 0,
        downloadStatus: null,
        estimatedSizeMb: null,
        error: null
    });

    // Load initial state
    useEffect(() => {
        async function loadState() {
            setState(prev => ({ ...prev, isLoading: true }));

            try {
                const resolution = await ContentPackResolver.resolve(bookId);
                const config = CONTENT_PACK_CONFIG[bookId];

                setState({
                    status: resolution.status,
                    isLoading: false,
                    downloadProgress: 0,
                    downloadStatus: null,
                    estimatedSizeMb: config?.estimatedSizeMb || null,
                    error: null
                });
            } catch (e) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Durum yüklenemedi'
                }));
            }
        }

        loadState();
    }, [bookId]);

    // Download function
    const download = useCallback(async () => {
        const config = CONTENT_PACK_CONFIG[bookId];

        if (!config || config.contentMode !== 'downloadable' || !config.downloadUrl) {
            setState(prev => ({ ...prev, error: 'İndirme için uygun değil' }));
            return false;
        }

        setState(prev => ({
            ...prev,
            downloadProgress: 0,
            downloadStatus: 'downloading',
            error: null
        }));

        const success = await ContentPackService.downloadPack(
            bookId,
            config.downloadUrl,
            (progress) => {
                setState(prev => ({
                    ...prev,
                    downloadProgress: progress.percentage,
                    downloadStatus: progress.status,
                    error: progress.error || null
                }));

                if (progress.status === 'completed') {
                    setState(prev => ({
                        ...prev,
                        status: 'downloaded',
                        downloadStatus: null
                    }));
                } else if (progress.status === 'failed') {
                    setState(prev => ({
                        ...prev,
                        downloadStatus: null,
                        error: progress.error || 'İndirme başarısız'
                    }));
                }
            }
        );

        return success;
    }, [bookId]);

    // Retry function
    const retry = useCallback(async () => {
        setState(prev => ({ ...prev, error: null }));
        return download();
    }, [download]);

    // Check if ready to open
    const isReady = state.status === 'bundled' || state.status === 'downloaded';
    const isDownloading = state.downloadStatus === 'downloading' ||
        state.downloadStatus === 'verifying' ||
        state.downloadStatus === 'installing';

    return {
        ...state,
        isReady,
        isDownloading,
        download,
        retry
    };
}
