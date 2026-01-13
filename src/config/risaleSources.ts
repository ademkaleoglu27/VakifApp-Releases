import * as FileSystem from 'expo-file-system';

export interface RisaleBook {
    id: string;
    title: string;
    fileName: string;
    // sourceUrl removed - no longer needed for LAN download
}

export const RISALE_BOOKS: RisaleBook[] = [
    { id: 'sozler', title: 'Sözler', fileName: '' }, // PDF removed
    { id: 'mektubat', title: 'Mektubat', fileName: '' },
    { id: 'lemalar', title: 'Lemalar', fileName: '' },
    { id: 'sualar', title: 'Şualar', fileName: '' },
    { id: 'barla-lahikasi', title: 'Barla Lahikası', fileName: '' },
    { id: 'kastamonu-lahikasi', title: 'Kastamonu Lahikası', fileName: '' },
    { id: 'emirdag-lahikasi', title: 'Emirdağ Lahikası', fileName: '' },
    { id: 'asayi-musa', title: 'Asâ-yı Musa', fileName: '' },
    { id: 'mesnevi-nuriye', title: 'Mesnevi-i Nuriye', fileName: '' },
    { id: 'muhakemat', title: 'Muhakemat', fileName: '' },
    { id: 'sikke-i-tasdiki-gaybi', title: 'Sikke-i Tasdik-i Gaybi', fileName: '' },
    { id: 'tarihce-i-hayat', title: 'Tarihçe-i Hayat', fileName: '' },
    { id: 'iman-ve-kufur-muvazeneleri', title: 'İman ve Küfür Muvazeneleri', fileName: '' },
    { id: 'isaratul-icaz', title: 'İşaratü\'l-İcaz', fileName: '' },
];

export const getRisaleLocalPath = (fileName: string) => {
    return `${FileSystem.documentDirectory}risale/${fileName}`;
};

export const RISALE_DIR = `${FileSystem.documentDirectory}risale/`;
