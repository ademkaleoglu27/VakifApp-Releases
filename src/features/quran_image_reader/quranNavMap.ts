import METADATA from '../quran-pdf/data/quran_metadata.json';

export interface Surah {
    id: number;
    name: string;
    page: number;
}

export interface Juz {
    id: number;
    page: number;
}

export const QURAN_NAV_MAP = {
    surahs: METADATA.surahs as Surah[],
    juzs: METADATA.juzs as Juz[],
};

/**
 * Helper to find surah name by page number
 */
export const getSurahNameByPage = (page: number): string => {
    // Surahs are sorted by page. Find the last surah that starts before or on this page.
    const surah = [...QURAN_NAV_MAP.surahs]
        .reverse()
        .find(s => s.page <= page);
    return surah ? surah.name : 'Kur\'an-ı Kerim';
};

/**
 * Helper to get Juz number by page number
 */
export const getJuzByPage = (page: number): number => {
    const juz = [...QURAN_NAV_MAP.juzs]
        .reverse()
        .find(j => j.page <= page);
    return juz ? juz.id : 1;
};
