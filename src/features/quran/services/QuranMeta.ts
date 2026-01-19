// QuranMeta.ts - Data source for Surah names and page mappings (Standard Medina Mushaf 604 Pages)

export interface SurahMeta {
    number: number;
    nameTr: string; // Turkish name
    startPage: number;
    endPage: number;
}

// Compact dataset of Surah starting pages (Standard Medina)
const SURAH_START_PAGES = [
    { n: 1, p: 1, name: "Fâtiha" },
    { n: 2, p: 2, name: "Bakara" },
    { n: 3, p: 50, name: "ÂlI İmrân" },
    { n: 4, p: 77, name: "Nisâ" },
    { n: 5, p: 106, name: "Mâide" },
    { n: 6, p: 128, name: "En'âm" },
    { n: 7, p: 151, name: "A'râf" },
    { n: 8, p: 177, name: "Enfâl" },
    { n: 9, p: 187, name: "Tevbe" },
    { n: 10, p: 208, name: "Yûnus" },
    { n: 11, p: 221, name: "Hûd" },
    { n: 12, p: 235, name: "Yûsuf" },
    { n: 13, p: 249, name: "Ra'd" },
    { n: 14, p: 255, name: "İbrâhîm" },
    { n: 15, p: 262, name: "Hicr" },
    { n: 16, p: 267, name: "Nahl" },
    { n: 17, p: 282, name: "İsrâ" },
    { n: 18, p: 293, name: "Kehf" },
    { n: 19, p: 305, name: "Meryem" },
    { n: 20, p: 312, name: "Tâhâ" },
    { n: 21, p: 322, name: "Enbiyâ" },
    { n: 22, p: 332, name: "Hacc" },
    { n: 23, p: 342, name: "Mü'minûn" },
    { n: 24, p: 350, name: "Nûr" },
    { n: 25, p: 359, name: "Furkân" },
    { n: 26, p: 367, name: "Şu'arâ" },
    { n: 27, p: 377, name: "Neml" },
    { n: 28, p: 385, name: "Kasas" },
    { n: 29, p: 396, name: "Ankebût" },
    { n: 30, p: 404, name: "Rûm" },
    { n: 31, p: 411, name: "Lokmân" },
    { n: 32, p: 415, name: "Secde" },
    { n: 33, p: 418, name: "Ahzâb" },
    { n: 34, p: 428, name: "Sebe'" },
    { n: 35, p: 434, name: "Fâtır" },
    { n: 36, p: 440, name: "Yâsîn" },
    { n: 37, p: 446, name: "Sâffât" },
    { n: 38, p: 453, name: "Sâd" },
    { n: 39, p: 458, name: "Zümer" },
    { n: 40, p: 467, name: "Mü'min" },
    { n: 41, p: 477, name: "Fussilet" },
    { n: 42, p: 483, name: "Şûrâ" },
    { n: 43, p: 489, name: "Zuhruf" },
    { n: 44, p: 496, name: "Duhân" },
    { n: 45, p: 499, name: "Câsiye" },
    { n: 46, p: 502, name: "Ahkaf" },
    { n: 47, p: 507, name: "Muhammed" },
    { n: 48, p: 511, name: "Fetih" },
    { n: 49, p: 515, name: "Hucurât" },
    { n: 50, p: 518, name: "Kâf" },
    { n: 51, p: 520, name: "Zâriyât" },
    { n: 52, p: 523, name: "Tûr" },
    { n: 53, p: 526, name: "Necm" },
    { n: 54, p: 528, name: "Kamer" },
    { n: 55, p: 531, name: "Rahmân" },
    { n: 56, p: 534, name: "Vâkıa" },
    { n: 57, p: 537, name: "Hadîd" },
    { n: 58, p: 542, name: "Mücâdele" },
    { n: 59, p: 545, name: "Haşr" },
    { n: 60, p: 549, name: "Mümtehine" },
    { n: 61, p: 551, name: "Saff" },
    { n: 62, p: 553, name: "Cum'a" },
    { n: 63, p: 554, name: "Münâfikûn" },
    { n: 64, p: 556, name: "Teğâbûn" },
    { n: 65, p: 558, name: "Talâk" },
    { n: 66, p: 560, name: "Tahrîm" },
    { n: 67, p: 562, name: "Mülk" },
    { n: 68, p: 564, name: "Kalem" },
    { n: 69, p: 566, name: "Hâkka" },
    { n: 70, p: 568, name: "Me'âric" },
    { n: 71, p: 570, name: "Nûh" },
    { n: 72, p: 572, name: "Cinn" },
    { n: 73, p: 574, name: "Müzzemmil" },
    { n: 74, p: 575, name: "Müddessir" },
    { n: 75, p: 577, name: "Kıyâme" },
    { n: 76, p: 578, name: "İnsân" },
    { n: 77, p: 580, name: "Mürselât" },
    { n: 78, p: 582, name: "Nebe'" },
    { n: 79, p: 583, name: "Nâzi'ât" },
    { n: 80, p: 585, name: "Abese" },
    { n: 81, p: 586, name: "Tekvîr" },
    { n: 82, p: 587, name: "İnfitâr" },
    { n: 83, p: 587, name: "Mutaffifîn" },
    { n: 84, p: 589, name: "İnşikâk" },
    { n: 85, p: 590, name: "Burûc" },
    { n: 86, p: 591, name: "Târık" },
    { n: 87, p: 591, name: "A'lâ" },
    { n: 88, p: 592, name: "Gâşiye" },
    { n: 89, p: 593, name: "Fecr" },
    { n: 90, p: 594, name: "Beled" },
    { n: 91, p: 595, name: "Şems" },
    { n: 92, p: 595, name: "Leyl" },
    { n: 93, p: 596, name: "Duhâ" },
    { n: 94, p: 596, name: "İnşirâh" },
    { n: 95, p: 597, name: "Tîn" },
    { n: 96, p: 597, name: "Alak" },
    { n: 97, p: 598, name: "Kadir" },
    { n: 98, p: 598, name: "Beyyine" },
    { n: 99, p: 599, name: "Zilzâl" },
    { n: 100, p: 599, name: "Âdiyât" },
    { n: 101, p: 600, name: "Kâri'a" },
    { n: 102, p: 600, name: "Tekâsür" },
    { n: 103, p: 601, name: "Asr" },
    { n: 104, p: 601, name: "Hümeze" },
    { n: 105, p: 601, name: "Fîl" },
    { n: 106, p: 602, name: "Kureyş" },
    { n: 107, p: 602, name: "Mâ'ûn" },
    { n: 108, p: 602, name: "Kevser" },
    { n: 109, p: 603, name: "Kâfirûn" },
    { n: 110, p: 603, name: "Nasr" },
    { n: 111, p: 603, name: "Tebbet" },
    { n: 112, p: 604, name: "İhlâs" },
    { n: 113, p: 604, name: "Felâk" },
    { n: 114, p: 604, name: "Nâs" }
];

export const QuranMeta = {
    /**
     * Finds the Surah name for a given page.
     * Logic: Returns the Surah that STARTED on this page or BEFORE this page.
     * Effectively finding the "Current Surah".
     */
    getSurahNameByPage(pageNumber: number): string {
        // Find the last Surah that has startPage <= pageNumber
        let foundSurah = SURAH_START_PAGES[0];
        for (const s of SURAH_START_PAGES) {
            if (s.p <= pageNumber) {
                foundSurah = s;
            } else {
                break; // Because list is ordered by page
            }
        }
        return foundSurah.name + " Suresi";
    }
};
