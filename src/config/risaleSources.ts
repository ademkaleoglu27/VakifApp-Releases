import * as FileSystem from 'expo-file-system';

export interface RisaleBook {
    id: string;
    title: string;
    fileName: string;
    // sourceUrl removed - no longer needed for LAN download
}

export const RISALE_BOOKS: RisaleBook[] = [
    { id: 'sozler', title: 'Sözler', fileName: 'sozler.pdf' },
    { id: 'mektubat', title: 'Mektubat', fileName: 'mektubat.pdf' },
    { id: 'lemalar', title: 'Lemalar', fileName: 'lemalar.pdf' },
    { id: 'sualar', title: 'Şualar', fileName: 'sualar.pdf' },
    { id: 'barla-lahikasi', title: 'Barla Lahikası', fileName: 'barla-lahikasi.pdf' },
    { id: 'kastamonu-lahikasi', title: 'Kastamonu Lahikası', fileName: 'kastamonu-lahikasi.pdf' },
    { id: 'emirdag-lahikasi', title: 'Emirdağ Lahikası', fileName: 'emirdag-lahikasi.pdf' },
    { id: 'asayi-musa', title: 'Asâ-yı Musa', fileName: 'asayi-musa.pdf' },
    { id: 'mesnevi-nuriye', title: 'Mesnevi-i Nuriye', fileName: 'mesnevi-nuriye.pdf' },
    { id: 'muhakemat', title: 'Muhakemat', fileName: 'muhakemat.pdf' },
    { id: 'sikke-i-tasdiki-gaybi', title: 'Sikke-i Tasdik-i Gaybi', fileName: 'sikke-i-tasdiki-gaybi.pdf' },
    { id: 'tarihce-i-hayat', title: 'Tarihçe-i Hayat', fileName: 'tarihce-i-hayat.pdf' },
    { id: 'iman-ve-kufur-muvazeneleri', title: 'İman ve Küfür Muvazeneleri', fileName: 'iman-ve-kufur-muvazeneleri.pdf' },
    { id: 'isaratul-icaz', title: 'İşaratü\'l-İcaz', fileName: 'isaratul-icaz.pdf' },
];

export const getRisaleLocalPath = (fileName: string) => {
    return `${FileSystem.documentDirectory}risale/${fileName}`;
};

export const RISALE_DIR = `${FileSystem.documentDirectory}risale/`;
