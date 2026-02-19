
export interface CevsenChapter {
    id: number;
    title: string;
    page: number; // The actual image index (Action)
    displayPage: number; // The page number shown in the book (TOC)
}

export const CEVSEN_CHAPTERS: CevsenChapter[] = [
    { id: 1, title: "Yâsîn Sûresi", displayPage: 7, page: 7 },
    { id: 2, title: "Fetih Sûresi", displayPage: 14, page: 14 },
    { id: 3, title: "Rahmân Sûresi", displayPage: 20, page: 20 },
    { id: 4, title: "Haşir Sûresi'nin Sonu", displayPage: 24, page: 24 },
    { id: 5, title: "Mülk Sûresi", displayPage: 25, page: 25 },
    { id: 6, title: "Nebe' Sûresi", displayPage: 28, page: 28 },
    { id: 7, title: "Bakara Sûresi'nin Son İki Âyeti", displayPage: 30, page: 30 },
    { id: 8, title: "Cevşenü'l-Kebîr Metninin Tercümesi (Metin)", displayPage: 35, page: 35 },
    { id: 9, title: "Evrâd-ı Kudsiye", displayPage: 90, page: 90 },
    { id: 10, title: "Delâilü'n-Nûr", displayPage: 117, page: 117 },
    { id: 11, title: "Sekîne Duası", displayPage: 134, page: 134 },
    { id: 12, title: "Veysel Karanî'nin Duası", displayPage: 136, page: 136 },
    { id: 13, title: "Dua-u Tercümân-ı İsm-i A'zam", displayPage: 138, page: 138 },
    { id: 14, title: "Dua-u İsm-i A'zam", displayPage: 142, page: 142 },
    { id: 15, title: "Münâcâtü'l-Kur'ân", displayPage: 146, page: 146 },
    { id: 16, title: "Tahmîdiyye", displayPage: 179, page: 179 },
    { id: 17, title: "Hülâsatü'l-Hülâsa", displayPage: 203, page: 203 },
    { id: 18, title: "Münâcât (Abdülkâdir Geylanî'nin Duası)", displayPage: 221, page: 221 },
    { id: 19, title: "Bir Dua", displayPage: 226, page: 226 },
    { id: 20, title: "Bâbu'ş-Şefâat", displayPage: 234, page: 234 }
];
