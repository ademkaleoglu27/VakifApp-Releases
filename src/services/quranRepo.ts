import { getDb } from './contentDb';

export interface Surah {
    id: number;
    name_ar: string;
    name_tr: string;
    ayah_count: number;
}

export interface Ayah {
    id: number;
    surah_id: number;
    ayah_number: number;
    text_ar: string;
}

export const getSurahList = async (): Promise<Surah[]> => {
    const db = getDb();
    // getAllAsync is the new API in expo-sqlite/next
    return await db.getAllAsync<Surah>('SELECT * FROM q_surah ORDER BY id ASC');
};

export const getAyahsBySurah = async (surahId: number): Promise<Ayah[]> => {
    const db = getDb();
    return await db.getAllAsync<Ayah>(
        'SELECT * FROM q_ayah WHERE surah_id = ? ORDER BY ayah_number ASC',
        [surahId]
    );
};

export const getSurahById = async (surahId: number): Promise<Surah | null> => {
    const db = getDb();
    return await db.getFirstAsync<Surah>('SELECT * FROM q_surah WHERE id = ?', [surahId]);
};
