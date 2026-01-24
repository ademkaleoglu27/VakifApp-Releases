import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PackStatus = 'NOT_INSTALLED' | 'DOWNLOADING' | 'PARTIAL' | 'INSTALLED' | 'CORRUPT';

interface QuranState {
    status: PackStatus;
    installedVersion: string | null;
    installedParts: string[];
    installedAt: string | null;
    lastPageNumber: number;
    lastUpdatedAt: string | null;
    lastError: string | null;
    failedAssetId: string | null;
    failedAt: string | null;
    retryCount: number;
    downloadProgress: number; // 0..1
    detailedStatus: string | null; // e.g., "Doğrulanıyor...", "Zipleniyor..."
    totalPages: number; // Unified source for reader

    // Actions
    setStatus: (status: PackStatus) => void;
    setDetailedStatus: (msg: string | null) => void;
    setInstalledVersion: (version: string) => void;
    addInstalledPart: (partId: string) => void;
    setLastPageNumber: (page: number) => void;
    setDownloadProgress: (progress: number) => void;
    setTotalPages: (count: number) => void;
    setError: (error: string | null, assetId?: string) => void;
    incrementRetry: () => void;
    resetPack: () => void;
}

export const useQuranStore = create<QuranState>()(
    persist(
        (set) => ({
            status: 'NOT_INSTALLED',
            installedVersion: null,
            installedParts: [],
            installedAt: null,
            lastPageNumber: 1,
            lastUpdatedAt: null,
            lastError: null,
            failedAssetId: null,
            failedAt: null,
            retryCount: 0,
            downloadProgress: 0,
            detailedStatus: null,
            totalPages: 604, // Default Medina Mushaf

            setStatus: (status) => set({
                status,
                lastUpdatedAt: new Date().toISOString(),
                ...(status === 'INSTALLED' ? { installedAt: new Date().toISOString(), retryCount: 0, lastError: null, failedAt: null } : {})
            }),
            setDetailedStatus: (detailedStatus) => set({ detailedStatus }),
            setInstalledVersion: (installedVersion) => set({ installedVersion }),
            addInstalledPart: (partId) => set((state) => ({
                installedParts: state.installedParts.includes(partId)
                    ? state.installedParts
                    : [...state.installedParts, partId]
            })),
            setLastPageNumber: (lastPageNumber) => set({ lastPageNumber }),
            setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
            setTotalPages: (totalPages) => set({ totalPages }),
            setError: (lastError, failedAssetId) => set((state) => ({
                lastError,
                failedAssetId: failedAssetId || null,
                failedAt: lastError ? new Date().toISOString() : null,
                status: lastError ? 'CORRUPT' : 'NOT_INSTALLED',
                detailedStatus: null
            })),
            incrementRetry: () => set((state) => ({ retryCount: state.retryCount + 1 })),
            resetPack: () => set({
                status: 'NOT_INSTALLED',
                installedVersion: null,
                installedParts: [],
                installedAt: null,
                lastError: null,
                failedAssetId: null,
                failedAt: null,
                retryCount: 0,
                downloadProgress: 0,
                detailedStatus: null,
                totalPages: 604
            }),
        }),
        {
            name: 'quran-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                status: state.status,
                installedVersion: state.installedVersion,
                installedParts: state.installedParts,
                installedAt: state.installedAt,
                lastPageNumber: state.lastPageNumber,
                lastUpdatedAt: state.lastUpdatedAt,
                retryCount: state.retryCount,
                totalPages: state.totalPages
            }),
        }
    )
);
