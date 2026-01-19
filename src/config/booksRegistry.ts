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
 * 
 * ⚠️ LIBRARY_CONTRACT v1.1: Books within FROZEN_BLOCK are protected.
 * To modify FROZEN entries, you must include CONTRACT_EXCEPTION_TOKEN in commit message.
 * New books can be added AFTER FROZEN_BLOCK_END.
 */

// FROZEN_BLOCK_START - Do NOT modify entries below without CONTRACT_EXCEPTION_TOKEN
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
// FROZEN_BLOCK_END - New books can be added below this line

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT PACK CONFIGURATION (Outside FROZEN block - Library Contract v1.1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Content pack configuration for bundled vs downloadable content.
 * - bundled: Content is included in APK (only Sözler)
 * - downloadable: Content must be downloaded before reading
 */
export interface ContentPackConfig {
    contentMode: 'bundled' | 'downloadable';
    contentPackId?: string;          // For downloadable packs
    estimatedSizeMb?: number;        // Download size in MB
    downloadUrl?: string;            // Remote URL for content pack
    bundledAssetPath?: string;       // For bundled content
}

/**
 * Content pack configuration for all books.
 * Sözler is bundled, all others are downloadable.
 */
export const CONTENT_PACK_CONFIG: Record<string, ContentPackConfig> = {
    // ═══════════════════════════════════════════════════════════════════════
    // BUNDLED (Included in APK)
    // ═══════════════════════════════════════════════════════════════════════
    'sozler': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/01_sozler'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DOWNLOADABLE (Must be downloaded)
    // ═══════════════════════════════════════════════════════════════════════
    'mektubat': {
        contentMode: 'downloadable',
        contentPackId: 'risale.mektubat.v1',
        estimatedSizeMb: 2.8,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/mektubat.zip'
    },
    'lemalar': {
        contentMode: 'downloadable',
        contentPackId: 'risale.lemalar.v1',
        estimatedSizeMb: 2.2,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/lemalar.zip'
    },
    'sualar': {
        contentMode: 'downloadable',
        contentPackId: 'risale.sualar.v1',
        estimatedSizeMb: 3.1,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/sualar.zip'
    },
    'tarihce': {
        contentMode: 'downloadable',
        contentPackId: 'risale.tarihce.v1',
        estimatedSizeMb: 2.0,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/tarihce.zip'
    },
    'mesnevi': {
        contentMode: 'downloadable',
        contentPackId: 'risale.mesnevi.v1',
        estimatedSizeMb: 1.5,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/mesnevi.zip'
    },
    'isarat': {
        contentMode: 'downloadable',
        contentPackId: 'risale.isarat.v1',
        estimatedSizeMb: 1.8,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/isarat.zip'
    },
    'sikke': {
        contentMode: 'downloadable',
        contentPackId: 'risale.sikke.v1',
        estimatedSizeMb: 1.2,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/sikke.zip'
    },
    'barla': {
        contentMode: 'downloadable',
        contentPackId: 'risale.barla.v1',
        estimatedSizeMb: 1.6,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/barla.zip'
    },
    'kastamonu': {
        contentMode: 'downloadable',
        contentPackId: 'risale.kastamonu.v1',
        estimatedSizeMb: 1.4,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/kastamonu.zip'
    },
    'emirdag1': {
        contentMode: 'downloadable',
        contentPackId: 'risale.emirdag1.v1',
        estimatedSizeMb: 1.3,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/emirdag1.zip'
    },
    'emirdag2': {
        contentMode: 'downloadable',
        contentPackId: 'risale.emirdag2.v1',
        estimatedSizeMb: 1.1,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/emirdag2.zip'
    },
    'asayi': {
        contentMode: 'downloadable',
        contentPackId: 'risale.asayi.v1',
        estimatedSizeMb: 1.0,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/asayi.zip'
    },
    'muhakemat': {
        contentMode: 'downloadable',
        contentPackId: 'risale.muhakemat.v1',
        estimatedSizeMb: 0.8,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/muhakemat.zip'
    },
    // Küçük Kitaplar
    'sunuhat': {
        contentMode: 'downloadable',
        contentPackId: 'risale.sunuhat.v1',
        estimatedSizeMb: 0.3,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/sunuhat.zip'
    },
    'isarat_k': {
        contentMode: 'downloadable',
        contentPackId: 'risale.isarat_k.v1',
        estimatedSizeMb: 0.2,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/isarat_k.zip'
    },
    'tuluat': {
        contentMode: 'downloadable',
        contentPackId: 'risale.tuluat.v1',
        estimatedSizeMb: 0.3,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/tuluat.zip'
    },
    'nurcesmesi': {
        contentMode: 'downloadable',
        contentPackId: 'risale.nurcesmesi.v1',
        estimatedSizeMb: 0.2,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/nurcesmesi.zip'
    },
    'divaniharbi': {
        contentMode: 'downloadable',
        contentPackId: 'risale.divaniharbi.v1',
        estimatedSizeMb: 0.4,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/divaniharbi.zip'
    },
    'hutbe': {
        contentMode: 'downloadable',
        contentPackId: 'risale.hutbe.v1',
        estimatedSizeMb: 0.3,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/hutbe.zip'
    },
    'munazarat': {
        contentMode: 'downloadable',
        contentPackId: 'risale.munazarat.v1',
        estimatedSizeMb: 0.3,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/munazarat.zip'
    },
    'genclik': {
        contentMode: 'downloadable',
        contentPackId: 'risale.genclik.v1',
        estimatedSizeMb: 0.2,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/genclik.zip'
    },
    'hanimlar': {
        contentMode: 'downloadable',
        contentPackId: 'risale.hanimlar.v1',
        estimatedSizeMb: 0.2,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/hanimlar.zip'
    },
    'konferans': {
        contentMode: 'downloadable',
        contentPackId: 'risale.konferans.v1',
        estimatedSizeMb: 0.3,
        downloadUrl: 'https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs/konferans.zip'
    },
};

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

