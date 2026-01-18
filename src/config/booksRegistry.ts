/**
 * Books Registry (Diamond Standard V23.1)
 * 
 * Central registry for Risale-i Nur books.
 * Add new books here and they will automatically appear in the menu.
 * 
 * REQUIREMENTS:
 * 1. Book must exist in risale.db (works table)
 * 2. Book must have sections + paragraphs data
 */

export interface BookEntry {
    id: string;          // DB work_id (e.g., 'sozler')
    title: string;       // Display title (e.g., 'Sözler')
    icon: string;        // Ionicons name
    enabled: boolean;    // Show in menu?
    bookId?: string;     // Canonical Book ID for DB queries
    readerType?: 'html'; // 'html' or undefined (legacy)
    manifestAssetPath?: string; // Path to manifest.json relative to android_asset
}

/**
 * Registry of available books.
 * Add new books here as they become available.
 */
export const BOOKS_REGISTRY: BookEntry[] = [
    {
        id: 'sozler',
        title: 'Sözler',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.sozler@diyanet.tr'
    },
    // Future books (disabled until data is ready):
    {
        id: 'mektubat',
        title: 'Mektubat',
        icon: 'mail-open-outline',
        enabled: true,
        bookId: 'risale.mektubat@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/02_mektubat/manifest.json'
    },
    {
        id: 'lemalar',
        title: 'Lemalar',
        icon: 'flash-outline',
        enabled: true,
        // Gold Standard: Canonical ID required
        bookId: 'risale.lemalar@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/03_lemalar/manifest.json'
    },
    {
        id: 'sualar',
        title: "Şualar",
        icon: 'sunny-outline',
        enabled: true,
        bookId: 'risale.sualar@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/04_sualar/manifest.json'
    },
    {
        id: 'tarihce',
        title: 'Tarihçe-i Hayat',
        icon: 'book-outline', // Updated icon
        enabled: true,
        bookId: 'risale.tarihce@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/05_tarihce/manifest.json'
    },
    {
        id: 'mesnevi',
        title: 'Mesnevî-i Nuriye',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.mesnevi@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/06_mesnevi/manifest.json'
    },
    {
        id: 'isarat',
        title: 'İşaratü\'l-i\'caz',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.isarat@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/07_isarat/manifest.json'
    },
    {
        id: 'sikke',
        title: 'Sikke-i Tasdik-i Gaybî',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.sikke@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/08_sikke/manifest.json'
    },
    {
        id: 'barla',
        title: 'Barla Lâhikası',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.barla@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/09_barla/manifest.json'
    },
    {
        id: 'kastamonu',
        title: 'Kastamonu Lâhikası',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.kastamonu@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/10_kastamonu/manifest.json'
    },
    {
        id: 'emirdag1',
        title: 'Emirdağ Lâhikası 1',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.emirdag1@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/11_emirdag1/manifest.json'
    },
    {
        id: 'emirdag2',
        title: 'Emirdağ Lâhikası 2',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.emirdag2@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/12_emirdag2/manifest.json'
    },
    {
        id: 'asayi',
        title: 'Asâ-yı Musa',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.asayi@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/13_asayi/manifest.json'
    },
    {
        id: 'muhakemat',
        title: 'Muhakemat',
        icon: 'book-outline',
        enabled: true,
        bookId: 'risale.muhakemat@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/14_muhakemat/manifest.json'
    },
    {
        id: 'asayi_musa',
        title: "Asâ-yı Musa",
        icon: 'star-outline',
        enabled: true,
        bookId: 'risale.asayi_musa@diyanet.tr',
    },
    {
        id: 'isaratul_icaz',
        title: "İşârâtü'l-İ'câz",
        icon: 'prism-outline',
        enabled: true,
        bookId: 'risale.isaratul_icaz@diyanet.tr',
    },
    {
        id: 'mesnevi_nuriye',
        title: "Mesnevî-i Nuriye",
        icon: 'rose-outline',
        enabled: true,
        bookId: 'risale.mesnevi_nuriye@diyanet.tr',
    },
    {
        id: 'sikke_i_tasdik_i_gaybi',
        title: "Sikke-i Tasdik-i Gaybî",
        icon: 'checkmark-circle-outline',
        enabled: true,
        bookId: 'risale.sikke_i_tasdik_i_gaybi@diyanet.tr',
    },
    {
        id: 'barla_lahikasi',
        title: "Barla Lâhikası",
        icon: 'mail-outline',
        enabled: true,
        bookId: 'risale.barla_lahikasi@diyanet.tr',
    },
    {
        id: 'kastamonu_lahikasi',
        title: "Kastamonu Lâhikası",
        icon: 'mail-open-outline',
        enabled: true,
        bookId: 'risale.kastamonu_lahikasi@diyanet.tr',
    },
    {
        id: 'emirdag_lahikasi',
        title: "Emirdağ Lâhikası",
        icon: 'paper-plane-outline',
        enabled: true,
        bookId: 'risale.emirdag_lahikasi@diyanet.tr',
    },
    {
        id: 'tarihce_i_hayat',
        title: "Tarihçe-i Hayat",
        icon: 'time-outline',
        enabled: true,
        bookId: 'risale.tarihce_i_hayat@diyanet.tr',
    },
    // --- KÜÇÜK KİTAPLAR ---
    {
        id: 'sunuhat',
        title: 'Sünuhat',
        icon: 'sunny-outline',
        enabled: true,
        bookId: 'risale.sunuhat@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/15_sunuhat/manifest.json'
    },
    {
        id: 'isarat_k',
        title: 'İşarat',
        icon: 'flash-outline',
        enabled: true,
        bookId: 'risale.isarat_k@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/16_isarat_k/manifest.json'
    },
    {
        id: 'tuluat',
        title: 'Tulûat',
        icon: 'bulb-outline',
        enabled: true,
        bookId: 'risale.tuluat@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/17_tuluat/manifest.json'
    },
    {
        id: 'nurcesmesi',
        title: 'Nur Çeşmesi',
        icon: 'water-outline',
        enabled: true,
        bookId: 'risale.nurcesmesi@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/19_nurcesmesi/manifest.json'
    },
    {
        id: 'divaniharbi',
        title: 'Divan-ı Harb-i Örfî',
        icon: 'shield-outline',
        enabled: true,
        bookId: 'risale.divaniharbi@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/20_divaniharbi/manifest.json'
    },
    {
        id: 'hutbe',
        title: 'Hutbe-i Şamiye',
        icon: 'megaphone-outline',
        enabled: true,
        bookId: 'risale.hutbe@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/21_hutbe/manifest.json'
    },
    {
        id: 'munazarat',
        title: 'Münazarat',
        icon: 'chatbubbles-outline',
        enabled: true,
        bookId: 'risale.munazarat@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/22_munazarat/manifest.json'
    },
    {
        id: 'genclik',
        title: 'Gençlik Rehberi',
        icon: 'people-outline',
        enabled: true,
        bookId: 'risale.genclik@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/23_genclik/manifest.json'
    },
    {
        id: 'hanimlar',
        title: 'Hanımlar Rehberi',
        icon: 'flower-outline',
        enabled: true,
        bookId: 'risale.hanimlar@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/24_hanimlar/manifest.json'
    },
    {
        id: 'konferans',
        title: 'Konferans',
        icon: 'mic-outline',
        enabled: true,
        bookId: 'risale.konferans@diyanet.tr',
        readerType: 'html',
        manifestAssetPath: 'risale_html_pilot/25_konferans/manifest.json'
    },
];

/**
 * Get enabled books for menu display.
 */
export const getEnabledBooks = (): BookEntry[] => {
    return BOOKS_REGISTRY.filter(book => book.enabled);
};

/**
 * Get book by ID.
 */
export const getBookById = (id: string): BookEntry | undefined => {
    return BOOKS_REGISTRY.find(book => book.id === id);
};
