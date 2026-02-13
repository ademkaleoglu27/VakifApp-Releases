import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QuranTextState {
    // Reading state
    lastSurahId: number;
    lastVerseNumber: number;

    // Preferences
    selectedAuthorId: number;      // Default: 11 (Diyanet İşleri)
    selectedReciterId: number;     // Default: 7 (Mişari el-Afasi)
    showTransliteration: boolean;
    showTranslation: boolean;      // Meal göster/gizle
    fontSize: number;              // Arabic font size multiplier (1 = default)
    arabicFont: string;            // Arabic font family
    arabicColor: string;           // Arabic text color

    // Offline
    offlineCachedCount: number;    // How many surahs are cached

    // Actions
    setLastPosition: (surahId: number, verseNumber: number) => void;
    setSelectedAuthorId: (authorId: number) => void;
    setSelectedReciterId: (reciterId: number) => void;
    setShowTransliteration: (show: boolean) => void;
    setShowTranslation: (show: boolean) => void;
    setFontSize: (size: number) => void;
    setArabicFont: (font: string) => void;
    setArabicColor: (color: string) => void;
    setOfflineCachedCount: (count: number) => void;
}

export const useQuranTextStore = create<QuranTextState>()(
    persist(
        (set) => ({
            lastSurahId: 1,
            lastVerseNumber: 1,
            selectedAuthorId: 11,       // Diyanet İşleri
            selectedReciterId: 7,       // Mişari el-Afasi
            showTransliteration: true,
            showTranslation: true,       // Meal varsayılan açık
            fontSize: 1,
            arabicFont: 'ScheherazadeNew',
            arabicColor: '#1A237E',      // Deep blue (default)
            offlineCachedCount: 0,

            setLastPosition: (surahId, verseNumber) => set({ lastSurahId: surahId, lastVerseNumber: verseNumber }),
            setSelectedAuthorId: (selectedAuthorId) => set({ selectedAuthorId }),
            setSelectedReciterId: (selectedReciterId) => set({ selectedReciterId }),
            setShowTransliteration: (showTransliteration) => set({ showTransliteration }),
            setShowTranslation: (showTranslation) => set({ showTranslation }),
            setFontSize: (fontSize) => set({ fontSize }),
            setArabicFont: (arabicFont) => set({ arabicFont }),
            setArabicColor: (arabicColor) => set({ arabicColor }),
            setOfflineCachedCount: (offlineCachedCount) => set({ offlineCachedCount }),
        }),
        {
            name: 'quran-text-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                lastSurahId: state.lastSurahId,
                lastVerseNumber: state.lastVerseNumber,
                selectedAuthorId: state.selectedAuthorId,
                selectedReciterId: state.selectedReciterId,
                showTransliteration: state.showTransliteration,
                showTranslation: state.showTranslation,
                fontSize: state.fontSize,
                arabicFont: state.arabicFont,
                arabicColor: state.arabicColor,
            }),
        }
    )
);
