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
    // ALL 66 RISALE BOOKS (BUNDLED HTML PILOT IN APK)
    // ═══════════════════════════════════════════════════════════════════════
    'sozler': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/01_sozler'
    },
    'risale.sozler@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/01_sozler'
    },
    'mektubat': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/02_mektubat'
    },
    'risale.mektubat@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/02_mektubat'
    },
    'lemalar': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/03_lemalar'
    },
    'risale.lemalar@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/03_lemalar'
    },
    'sualar': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/04_sualar'
    },
    'risale.sualar@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/04_sualar'
    },
    'tarihce': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/05_tarihce'
    },
    'risale.tarihce@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/05_tarihce'
    },
    'mesnevi': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/06_mesnevi'
    },
    'risale.mesnevi@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/06_mesnevi'
    },
    'isarat': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/07_isarat'
    },
    'risale.isarat@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/07_isarat'
    },
    'sikke': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/08_sikke'
    },
    'risale.sikke@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/08_sikke'
    },
    'barla': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/09_barla'
    },
    'risale.barla@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/09_barla'
    },
    'kastamonu': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/10_kastamonu'
    },
    'risale.kastamonu@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/10_kastamonu'
    },
    'emirdag1': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/11_emirdag1'
    },
    'risale.emirdag1@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/11_emirdag1'
    },
    'emirdag2': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/12_emirdag2'
    },
    'risale.emirdag2@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/12_emirdag2'
    },
    'asayi': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/13_asayi'
    },
    'risale.asayi@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/13_asayi'
    },
    'muhakemat': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/14_muhakemat'
    },
    'risale.muhakemat@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/14_muhakemat'
    },
    'imankufur': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/15_imankufur'
    },
    'risale.imankufur@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/15_imankufur'
    },
    'sunuhat': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/15_sunuhat'
    },
    'risale.sunuhat@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/15_sunuhat'
    },
    'isarat_k': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/16_isarat_k'
    },
    'risale.isarat_k@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/16_isarat_k'
    },
    'tuluat': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/17_tuluat'
    },
    'risale.tuluat@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/17_tuluat'
    },
    'nurcesmesi': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/19_nurcesmesi'
    },
    'risale.nurcesmesi@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/19_nurcesmesi'
    },
    'divaniharbi': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/20_divaniharbi'
    },
    'risale.divaniharbi@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/20_divaniharbi'
    },
    'hutbe': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/21_hutbe'
    },
    'risale.hutbe@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/21_hutbe'
    },
    'munazarat': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/22_munazarat'
    },
    'risale.munazarat@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/22_munazarat'
    },
    'genclik': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/23_genclik'
    },
    'risale.genclik@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/23_genclik'
    },
    'hanimlar': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/24_hanimlar'
    },
    'risale.hanimlar@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/24_hanimlar'
    },
    'konferans': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/25_konferans'
    },
    'risale.konferans@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/25_konferans'
    },
    'risale.rnk.ayetkubra_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_ayetkubra_0'
    },
    'risale.rnk.bcevab_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_bcevab_0'
    },
    'risale.rnk.dvan_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_dvan_0'
    },
    'risale.rnk.e_nezerre_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_e_nezerre_0'
    },
    'risale.rnk.elhuccet_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_elhuccet_0'
    },
    'risale.rnk.gencreh_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_gencreh_0'
    },
    'risale.rnk.haknurlari_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_haknurlari_0'
    },
    'risale.rnk.hanimreh_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_hanimreh_0'
    },
    'risale.rnk.hasir_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_hasir_0'
    },
    'risale.rnk.hastalar_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_hastalar_0'
    },
    'risale.rnk.hizmetreh_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_hizmetreh_0'
    },
    'risale.rnk.hutbe_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_hutbe_0'
    },
    'risale.rnk.ihlas_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_ihlas_0'
    },
    'risale.rnk.ikincisua@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_ikincisua'
    },
    'risale.rnk.imanhak_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_imanhak_0'
    },
    'risale.rnk.konferans_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_konferans_0'
    },
    'risale.rnk.ksozler_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_ksozler_0'
    },
    'risale.rnk.latifnukte_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_latifnukte_0'
    },
    'risale.rnk.meyve_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_meyve_0'
    },
    'risale.rnk.miftah_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_miftah_0'
    },
    'risale.rnk.mirackamer_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_mirackamer_0'
    },
    'risale.rnk.muahmed@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_muahmed'
    },
    'risale.rnk.mukuran@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_mukuran'
    },
    'risale.rnk.munacat_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_munacat_0'
    },
    'risale.rnk.munazarat_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_munazarat_0'
    },
    'risale.rnk.nuralemi_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_nuralemi_0'
    },
    'risale.rnk.nurcesme_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_nurcesme_0'
    },
    'risale.rnk.nurilkka_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_nurilkka_0'
    },
    'risale.rnk.onucsua@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_onucsua'
    },
    'risale.rnk.otuzlema@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_otuzlema'
    },
    'risale.rnk.otuzuc_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_otuzuc_0'
    },
    'risale.rnk.rahmetsefkat_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_rahmetsefkat_0'
    },
    'risale.rnk.ramazan_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_ramazan_0'
    },
    'risale.rnk.sunnetseniye@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_sunnetseniye'
    },
    'risale.rnk.sunuhat_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_sunuhat_0'
    },
    'risale.rnk.tabiat_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_tabiat_0'
    },
    'risale.rnk.uhuvvet_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_uhuvvet_0'
    },
    'risale.rnk.vesvese@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_vesvese'
    },
    'risale.rnk.yirmidortmek@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_yirmidortmek'
    },
    'risale.rnk.yirmiuc_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_yirmiuc_0'
    },
    'risale.rnk.zuhretunnur_0@diyanet.tr': {
        contentMode: 'bundled',
        bundledAssetPath: 'risale_html_pilot/kucuk_rnk_zuhretunnur_0'
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
