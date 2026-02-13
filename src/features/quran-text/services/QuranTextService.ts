/**
 * QuranTextService.ts
 * API communication with api.acikkuran.com and offline cache management.
 * 
 * Endpoints:
 *   GET /surahs         → All 114 surahs
 *   GET /surah/{id}     → Full surah with verses (optional ?author={authorId})
 *   GET /authors        → Available translation authors
 */
import * as FileSystem from 'expo-file-system';

// ─── Constants ──────────────────────────────────────────────
const API_BASE = 'https://api.acikkuran.com';
const CACHE_DIR = (FileSystem.documentDirectory ?? '') + 'quran_text/';
const SURAHS_CACHE_FILE = CACHE_DIR + 'surahs.json';
const AUTHORS_CACHE_FILE = CACHE_DIR + 'authors.json';

// Default = Diyanet İşleri (id: 11)
const DEFAULT_AUTHOR_ID = 11;

// ─── Reciter (Hafız) Constants ──────────────────────────────
const QURAN_COM_API = 'https://api.quran.com/api/v4';

export interface Reciter {
    id: number;
    name: string;       // Turkish name
    nameAr?: string;    // Arabic name
    style?: string;
}

export const RECITERS: Reciter[] = [
    { id: 0, name: 'Türkçe Meal', style: 'Diyanet' },
    { id: 7, name: 'Mişari Raşid el-Afasi' },
    { id: 2, name: 'Abdulbasit Abdussamed', style: 'Murattal' },
    { id: 1, name: 'Abdulbasit Abdussamed', style: 'Mücevved' },
    { id: 3, name: 'Abdurrahman es-Sudais' },
    { id: 4, name: 'Ebu Bekir eş-Şatri' },
    { id: 5, name: 'Hani er-Rifai' },
    { id: 6, name: 'Mahmud Halil el-Husari' },
    { id: 12, name: 'Mahmud Halil el-Husari', style: 'Muallim' },
    { id: 9, name: 'Muhammed S. el-Minşavi', style: 'Murattal' },
    { id: 8, name: 'Muhammed S. el-Minşavi', style: 'Mücevved' },
    { id: 10, name: 'Suud eş-Şureyim' },
    { id: 11, name: 'Muhammed et-Tablavi' },
];

// ─── Types ──────────────────────────────────────────────────
export interface SurahSummary {
    id: number;
    name: string;
    name_en: string;
    name_original: string;       // Arabic
    slug: string;
    verse_count: number;
    page_number: number;
    audio?: {
        mp3: string;
        duration: number;
        mp3_en: string;
        duration_en: number;
    };
}

export interface Verse {
    id: number;
    surah_id: number;
    verse_number: number;
    verse: string;               // Arabic text with harakat
    verse_simplified: string;    // Simplified Arabic
    page: number;
    juz_number: number;
    transcription: string;       // Turkish transliteration
    transcription_en: string;    // English transliteration
    translation: {
        id: number;
        text: string;
        author: {
            id: number;
            name: string;
            language: string;
            description: string;
        };
        footnotes: Array<{ id: number; text: string; number: number }> | null;
    };
}

export interface SurahDetail {
    id: number;
    name: string;
    name_en: string;
    name_original: string;
    name_translation_tr: string;
    name_translation_en: string;
    slug: string;
    verse_count: number;
    page_number: number;
    audio?: {
        mp3: string;
        duration: number;
    };
    verses: Verse[];
}

export interface Author {
    id: number;
    name: string;
    description: string | null;
    language: string;
}

// ─── Service ────────────────────────────────────────────────
export const QuranTextService = {

    /**
     * Ensures the cache directory exists.
     */
    async ensureCacheDir(): Promise<void> {
        const info = await FileSystem.getInfoAsync(CACHE_DIR);
        if (!info.exists) {
            await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        }
    },

    // ── Cache Helpers ──────────────────────────────────────

    async _readCache<T>(filePath: string): Promise<T | null> {
        try {
            const info = await FileSystem.getInfoAsync(filePath);
            if (!info.exists) return null;
            const raw = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
            return JSON.parse(raw) as T;
        } catch (e) {
            console.warn('[QuranTextService] Cache read error:', e);
            return null;
        }
    },

    async _writeCache(filePath: string, data: any): Promise<void> {
        try {
            await this.ensureCacheDir();
            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data), { encoding: FileSystem.EncodingType.UTF8 });
        } catch (e) {
            console.warn('[QuranTextService] Cache write error:', e);
        }
    },

    // ── API Calls ──────────────────────────────────────────

    /**
     * Fetches all 114 surahs. Uses cache-first strategy.
     */
    async getSurahs(forceRefresh = false): Promise<SurahSummary[]> {
        // 1. Try cache
        if (!forceRefresh) {
            const cached = await this._readCache<SurahSummary[]>(SURAHS_CACHE_FILE);
            if (cached && cached.length === 114) return cached;
        }

        // 2. Fetch from API
        try {
            const response = await fetch(`${API_BASE}/surahs`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const json = await response.json();
            const surahs: SurahSummary[] = json.data;

            // 3. Cache for offline
            await this._writeCache(SURAHS_CACHE_FILE, surahs);
            return surahs;
        } catch (e) {
            // 4. Fallback to cache even if stale
            const cached = await this._readCache<SurahSummary[]>(SURAHS_CACHE_FILE);
            if (cached) return cached;
            throw e;
        }
    },

    /**
     * Fetches a specific surah with all its verses.
     * @param surahId  1-114
     * @param authorId Optional meal author ID (default: 11 = Diyanet İşleri)
     */
    async getSurah(surahId: number, authorId: number = DEFAULT_AUTHOR_ID): Promise<SurahDetail> {
        const cacheFile = `${CACHE_DIR}surah_${surahId}_author_${authorId}.json`;

        // 1. Try cache
        const cached = await this._readCache<SurahDetail>(cacheFile);
        if (cached) return cached;

        // 2. Fetch from API
        try {
            const url = `${API_BASE}/surah/${surahId}?author=${authorId}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const json = await response.json();
            const surah: SurahDetail = json.data;

            // 3. Cache for offline
            await this._writeCache(cacheFile, surah);
            return surah;
        } catch (e) {
            // No cache fallback for individual surahs on first load
            throw e;
        }
    },

    /**
     * Fetches available translation authors.
     */
    async getAuthors(forceRefresh = false): Promise<Author[]> {
        if (!forceRefresh) {
            const cached = await this._readCache<Author[]>(AUTHORS_CACHE_FILE);
            if (cached && cached.length > 0) return cached;
        }

        try {
            const response = await fetch(`${API_BASE}/authors`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const json = await response.json();
            const authors: Author[] = json.data;
            await this._writeCache(AUTHORS_CACHE_FILE, authors);
            return authors;
        } catch (e) {
            const cached = await this._readCache<Author[]>(AUTHORS_CACHE_FILE);
            if (cached) return cached;
            throw e;
        }
    },

    // ── Bulk Download ──────────────────────────────────────

    /**
     * Downloads all 114 surahs for offline use.
     * @param authorId  Meal author
     * @param onProgress  Callback (completed, total)
     */
    async downloadAllSurahs(
        authorId: number = DEFAULT_AUTHOR_ID,
        onProgress?: (completed: number, total: number) => void
    ): Promise<void> {
        const total = 114;
        for (let i = 1; i <= total; i++) {
            const cacheFile = `${CACHE_DIR}surah_${i}_author_${authorId}.json`;
            const info = await FileSystem.getInfoAsync(cacheFile);

            if (!info.exists) {
                try {
                    await this.getSurah(i, authorId);
                } catch (e) {
                    console.warn(`[QuranTextService] Failed to download surah ${i}:`, e);
                    // Continue to next even if one fails
                }
            }

            onProgress?.(i, total);
        }
    },

    /**
     * Checks how many surahs are cached for offline.
     */
    async getOfflineStatus(authorId: number = DEFAULT_AUTHOR_ID): Promise<{ cached: number; total: number }> {
        let cached = 0;
        for (let i = 1; i <= 114; i++) {
            const cacheFile = `${CACHE_DIR}surah_${i}_author_${authorId}.json`;
            const info = await FileSystem.getInfoAsync(cacheFile);
            if (info.exists) cached++;
        }
        return { cached, total: 114 };
    },

    /**
     * Clears all cached surah data.
     */
    async clearCache(): Promise<void> {
        try {
            const info = await FileSystem.getInfoAsync(CACHE_DIR);
            if (info.exists) {
                await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
            }
        } catch (e) {
            console.warn('[QuranTextService] Clear cache error:', e);
        }
    },

    /**
     * Gets audio URL for a specific reciter and surah from quran.com API v4.
     */
    async getReciterAudioUrl(reciterId: number, surahId: number): Promise<string | null> {
        try {
            const res = await fetch(`${QURAN_COM_API}/chapter_recitations/${reciterId}/${surahId}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data?.audio_file?.audio_url || null;
        } catch (e) {
            console.warn('[QuranTextService] Reciter audio fetch error:', e);
            return null;
        }
    },
};
