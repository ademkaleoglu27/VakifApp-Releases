/**
 * QuranTextService.ts
 * Hybrid Quran Service: Offline-first with Fawaz Ahmed Global GitHub API & AçıkKuran fallback.
 */
import * as FileSystem from 'expo-file-system';
import METADATA from '../../quran-pdf/data/quran_metadata.json';
import { getAyahsBySurah, getSurahById } from '@/services/quranRepo';
import { risalePagesDb } from '@/services/risalePagesDb';

// ─── Constants ──────────────────────────────────────────────
const CACHE_DIR = (FileSystem.documentDirectory ?? '') + 'quran_text/';
const SURAHS_CACHE_FILE = CACHE_DIR + 'surahs.json';
const AUTHORS_CACHE_FILE = CACHE_DIR + 'authors.json';

// Default = Diyanet İşleri
const DEFAULT_AUTHOR_ID = 11;

// ─── Reciter (Hafız) Constants ──────────────────────────────
export interface Reciter {
    id: number;
    name: string;
    style?: string;
    subfolder: string;
}

export const RECITERS: Reciter[] = [
    { id: 7, name: 'Mişari Raşid el-Afasi', subfolder: 'Alafasy_128kbps' },
    { id: 2, name: 'Abdulbasit Abdussamed', style: 'Murattal', subfolder: 'Abdul_Basit_Murattal_192kbps' },
    { id: 1, name: 'Abdulbasit Abdussamed', style: 'Mücevved', subfolder: 'Abdul_Basit_Mujawwad_128kbps' },
    { id: 3, name: 'Abdurrahman es-Sudais', subfolder: 'Abdurrahmaan_As-Sudais_192kbps' },
    { id: 4, name: 'Ebu Bekir eş-Şatri', subfolder: 'Abu_Bakr_Ash-Shaatree_128kbps' },
    { id: 5, name: 'Hani er-Rifai', subfolder: 'Hani_Rifai_192kbps' },
    { id: 6, name: 'Mahmud Halil el-Husari', subfolder: 'Husary_128kbps' },
    { id: 9, name: 'Muhammed S. el-Minşavi', style: 'Murattal', subfolder: 'Minshawy_Murattal_128kbps' },
    { id: 10, name: 'Suud eş-Şureyim', subfolder: 'Saood_ash-Shuraym_128kbps' },
    { id: 13, name: 'Saad el-Gamidi', subfolder: 'Ghamadi_40kbps' },
    { id: 0, name: 'Türkçe Sesli Meal', style: 'Diyanet', subfolder: 'translations/besim_atasoy_128kbps' },
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

// ─── Offline Local Surah Metadata Fallback ───────────────────
const OFFLINE_SURAHS: SurahSummary[] = (METADATA.surahs || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    name_en: s.name,
    name_original: s.name_ar || s.name,
    slug: s.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    verse_count: s.verse_count || s.verses || 0,
    page_number: s.page || 1,
}));

export const QuranTextService = {

    async ensureCacheDir(): Promise<void> {
        try {
            const info = await FileSystem.getInfoAsync(CACHE_DIR);
            if (!info.exists) {
                await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
            }
        } catch { }
    },

    async _readCache<T>(filePath: string): Promise<T | null> {
        try {
            const info = await FileSystem.getInfoAsync(filePath);
            if (!info.exists) return null;
            const raw = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    },

    async _writeCache(filePath: string, data: any): Promise<void> {
        try {
            await this.ensureCacheDir();
            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data), { encoding: FileSystem.EncodingType.UTF8 });
        } catch { }
    },

    /**
     * Fetches all 114 surahs.
     * Guaranteed never to fail or throw network error because OFFLINE metadata is used immediately!
     */
    async getSurahs(): Promise<SurahSummary[]> {
        // 1. Try Cache
        const cached = await this._readCache<SurahSummary[]>(SURAHS_CACHE_FILE);
        if (cached && cached.length === 114) return cached;

        // 2. Fetch from API in background, but return OFFLINE_SURAHS if not ready
        try {
            const response = await fetch('https://api.acikkuran.com/surahs', { headers: { 'Accept': 'application/json' } });
            if (response.ok) {
                const json = await response.json();
                if (json.data && json.data.length === 114) {
                    await this._writeCache(SURAHS_CACHE_FILE, json.data);
                    return json.data;
                }
            }
        } catch { }

        return OFFLINE_SURAHS;
    },

    /**
     * Fetches a specific surah with all its verses (Offline Cache -> AlQuran Cloud -> Fawaz Ahmed GitHub API -> Local DB -> Emergency Fallback).
     */
    async getSurah(surahId: number, authorId: number = DEFAULT_AUTHOR_ID): Promise<SurahDetail> {
        const safeSurahId = Math.max(1, Math.min(114, Number(surahId) || 1));
        const cacheFile = `${CACHE_DIR}surah_${safeSurahId}_author_${authorId}.json`;

        // 1. Try cache
        try {
            const cached = await this._readCache<SurahDetail>(cacheFile);
            if (cached && Array.isArray(cached.verses) && cached.verses.length > 0) {
                return cached;
            }
        } catch (e) {
            console.warn('[QuranTextService] Cache read error:', e);
        }

        const surahMeta = (METADATA.surahs || []).find((s: any) => s.id === safeSurahId);
        const surahName = surahMeta?.name || `Sure ${safeSurahId}`;
        const pageNumber = surahMeta?.page || 1;

        // 1. Try local offline database (quran_mealler.db)
        try {
            const localAyahs = await risalePagesDb.getQuranAyahs(safeSurahId);
            if (localAyahs && localAyahs.length > 0) {
                const verses: Verse[] = localAyahs.map((a) => ({
                    id: a.id || (safeSurahId * 1000 + a.ayah_number),
                    surah_id: safeSurahId,
                    verse_number: a.ayah_number,
                    verse: a.text_ar || '',
                    verse_simplified: a.text_ar || '',
                    page: a.page_number || pageNumber,
                    juz_number: a.juz_number || Math.ceil((a.page_number || pageNumber) / 20),
                    transcription: a.transcription_tr || '',
                    transcription_en: a.transcription_tr || '',
                    translation: {
                        id: a.ayah_number,
                        text: a.text_tr || '',
                        author: {
                            id: DEFAULT_AUTHOR_ID,
                            name: 'Diyanet İşleri',
                            language: 'tr',
                            description: 'Diyanet İşleri Meali'
                        },
                        footnotes: null
                    }
                }));

                const detail: SurahDetail = {
                    id: safeSurahId,
                    name: surahName,
                    name_en: surahName,
                    name_original: (surahMeta as any)?.name_ar || surahName,
                    name_translation_tr: surahName,
                    name_translation_en: surahName,
                    slug: surahName.toLowerCase(),
                    verse_count: verses.length,
                    page_number: pageNumber,
                    audio: {
                        mp3: `https://everyayah.com/data/Alafasy_128kbps/${String(safeSurahId).padStart(3, '0')}001.mp3`,
                        duration: 0
                    },
                    verses
                };

                return detail;
            }
        } catch (dbErr) {
            console.warn('[QuranTextService] Local DB error, falling back to online API:', dbErr);
        }

        // 2. Try AlQuran Cloud (Multi-edition: Uthmani Arabic + Diyanet Meal + Turkish Transliteration)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const cloudRes = await fetch(
                `https://api.alquran.cloud/v1/surah/${safeSurahId}/editions/quran-uthmani,tr.diyanet,tr.transliteration`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (cloudRes.ok) {
                const cloudJson = await cloudRes.json();
                if (cloudJson.data && cloudJson.data.length >= 2) {
                    const arabicAyahs = cloudJson.data[0]?.ayahs || [];
                    const diyanetAyahs = cloudJson.data[1]?.ayahs || [];
                    const translitAyahs = cloudJson.data[2]?.ayahs || [];

                    if (arabicAyahs.length > 0) {
                        const verses: Verse[] = arabicAyahs.map((ar: any, idx: number) => {
                            const trText = diyanetAyahs[idx]?.text || '';
                            const translitText = translitAyahs[idx]?.text || '';
                            const verseNum = ar.numberInSurah || (idx + 1);

                            return {
                                id: (safeSurahId * 1000) + verseNum,
                                surah_id: safeSurahId,
                                verse_number: verseNum,
                                verse: ar.text || '',
                                verse_simplified: ar.text || '',
                                page: ar.page || pageNumber,
                                juz_number: ar.juz || Math.ceil(pageNumber / 20),
                                transcription: translitText,
                                transcription_en: translitText,
                                translation: {
                                    id: verseNum,
                                    text: trText,
                                    author: {
                                        id: DEFAULT_AUTHOR_ID,
                                        name: 'Diyanet İşleri',
                                        language: 'tr',
                                        description: 'Diyanet İşleri Meali'
                                    },
                                    footnotes: null
                                }
                            };
                        });

                        const detail: SurahDetail = {
                            id: safeSurahId,
                            name: surahName,
                            name_en: surahName,
                            name_original: (surahMeta as any)?.name_ar || surahName,
                            name_translation_tr: surahName,
                            name_translation_en: surahName,
                            slug: surahName.toLowerCase(),
                            verse_count: verses.length,
                            page_number: pageNumber,
                            audio: {
                                mp3: `https://everyayah.com/data/Alafasy_128kbps/${String(safeSurahId).padStart(3, '0')}001.mp3`,
                                duration: 0
                            },
                            verses
                        };

                        this._writeCache(cacheFile, detail).catch(() => { });
                        return detail;
                    }
                }
            }
        } catch (cloudErr) {
            console.warn('[QuranTextService] AlQuran Cloud API error, trying Fawaz Ahmed CDN:', cloudErr);
        }

        // 3. Try Fawaz Ahmed GitHub Quran Dataset (World-famous open source GitHub API)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const [trRes, arRes] = await Promise.all([
                fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/tur-diyanetisleri/${safeSurahId}.json`, { signal: controller.signal }),
                fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmanienc/${safeSurahId}.json`, { signal: controller.signal })
            ]);
            clearTimeout(timeoutId);

            if (trRes.ok && arRes.ok) {
                const trJson = await trRes.json();
                const arJson = await arRes.json();

                if (Array.isArray(trJson.chapter) && trJson.chapter.length > 0) {
                    const verses: Verse[] = trJson.chapter.map((v: any, index: number) => {
                        const arVerse = arJson.chapter?.[index]?.text || '';
                        return {
                            id: (safeSurahId * 1000) + v.verse,
                            surah_id: safeSurahId,
                            verse_number: v.verse,
                            verse: arVerse,
                            verse_simplified: arVerse,
                            page: pageNumber,
                            juz_number: Math.ceil(pageNumber / 20),
                            transcription: '',
                            transcription_en: '',
                            translation: {
                                id: v.verse,
                                text: v.text,
                                author: {
                                    id: DEFAULT_AUTHOR_ID,
                                    name: 'Diyanet İşleri',
                                    language: 'tr',
                                    description: 'Diyanet İşleri Meali'
                                },
                                footnotes: null
                            }
                        };
                    });

                    const detail: SurahDetail = {
                        id: safeSurahId,
                        name: surahName,
                        name_en: surahName,
                        name_original: (surahMeta as any)?.name_ar || surahName,
                        name_translation_tr: surahName,
                        name_translation_en: surahName,
                        slug: surahName.toLowerCase(),
                        verse_count: verses.length,
                        page_number: pageNumber,
                        audio: {
                            mp3: `https://everyayah.com/data/Alafasy_128kbps/${String(safeSurahId).padStart(3, '0')}001.mp3`,
                            duration: 0
                        },
                        verses
                    };

                    this._writeCache(cacheFile, detail).catch(() => { });
                    return detail;
                }
            }
        } catch (fawazErr) {
            console.warn('[QuranTextService] Fawaz API fetch error, falling back to local DB:', fawazErr);
        }

        // 4. Fallback to offline SQLite database (q_ayah table in risale.db)
        try {
            const dbAyahs = await getAyahsBySurah(safeSurahId);
            if (dbAyahs && Array.isArray(dbAyahs) && dbAyahs.length > 0) {
                const verses: Verse[] = dbAyahs.map((a: any) => ({
                    id: a.id || (safeSurahId * 1000 + a.ayah_number),
                    surah_id: safeSurahId,
                    verse_number: a.ayah_number,
                    verse: a.text_ar || '',
                    verse_simplified: a.text_ar || '',
                    page: pageNumber,
                    juz_number: Math.ceil(pageNumber / 20),
                    transcription: '',
                    transcription_en: '',
                    translation: {
                        id: a.ayah_number,
                        text: '',
                        author: {
                            id: DEFAULT_AUTHOR_ID,
                            name: 'Diyanet İşleri',
                            language: 'tr',
                            description: 'Diyanet İşleri Meali'
                        },
                        footnotes: null
                    }
                }));

                const detail: SurahDetail = {
                    id: safeSurahId,
                    name: surahName,
                    name_en: surahName,
                    name_original: (surahMeta as any)?.name_ar || surahName,
                    name_translation_tr: surahName,
                    name_translation_en: surahName,
                    slug: surahName.toLowerCase(),
                    verse_count: verses.length,
                    page_number: pageNumber,
                    audio: {
                        mp3: `https://everyayah.com/data/Alafasy_128kbps/${String(safeSurahId).padStart(3, '0')}001.mp3`,
                        duration: 0
                    },
                    verses
                };

                return detail;
            }
        } catch (dbErr) {
            console.warn('[QuranTextService] DB fallback error:', dbErr);
        }

        throw new Error('Sure yüklenemedi. Lütfen internet bağlantınızı kontrol ediniz.');
    },

    /**
     * Get Audio URL for specific Verse for a Reciter
     */
    getAyahAudioUrl(surahId: number, verseNumber: number, reciterId: number = 7): string {
        const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
        const s = String(surahId).padStart(3, '0');
        const v = String(verseNumber).padStart(3, '0');
        return `https://everyayah.com/data/${reciter.subfolder}/${s}${v}.mp3`;
    },

    /**
     * Get Full Surah Audio URL for a specific Reciter via Quran.com API
     */
    async getReciterAudioUrl(reciterId: number, surahId: number): Promise<string | null> {
        try {
            const res = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surahId}`);
            if (res.ok) {
                const json = await res.json();
                if (json.audio_file?.audio_url) {
                    return json.audio_file.audio_url;
                }
            }
        } catch (e) {
            console.warn('[QuranTextService] Failed to fetch reciter audio URL:', e);
        }

        // Fallback to EveryAyah 1st ayah
        const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
        const s = String(surahId).padStart(3, '0');
        return `https://everyayah.com/data/${reciter.subfolder}/${s}001.mp3`;
    }
};
