import { BookRecord } from './LibraryRegistry';

/**
 * SEED_LOCKED_BOOKS
 * 
 * Hardcoded, immutable list of "Big" and "Small" books.
 * These records are LOCKED by default and cannot be overwritten by automatic processes.
 * 
 * Source: Derived from htmlManifest.generated.ts (Diamond Standard)
 */
export const SEED_LOCKED_BOOKS: BookRecord[] = [
    // --- BÜYÜK KİTAPLAR (SHELF_BIG) ---
    {
        bookId: 'risale.sozler@diyanet.tr',
        title: 'Sözler',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.mektubat@diyanet.tr',
        title: 'Mektubat',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.lemalar@diyanet.tr',
        title: 'Lemalar',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.sualar@diyanet.tr',
        title: 'Şualar',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.tarihce@diyanet.tr', // Note: mapped from config/booksRegistry, reconciling with manifest if needed
        title: 'Tarihçe-i Hayat',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.mesnevi@diyanet.tr',
        title: 'Mesnevî-i Nuriye',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.isarat@diyanet.tr',
        title: 'İşaratü\'l-i\'caz',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.barla@diyanet.tr',
        title: 'Barla Lâhikası',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.kastamonu@diyanet.tr',
        title: 'Kastamonu Lâhikası',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.emirdag1@diyanet.tr',
        title: 'Emirdağ Lâhikası 1',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.emirdag2@diyanet.tr',
        title: 'Emirdağ Lâhikası 2',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.asayi@diyanet.tr',
        title: 'Asâ-yı Musa',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.muhakemat@diyanet.tr',
        title: 'Muhakemat',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.sikke@diyanet.tr',
        title: 'Sikke-i Tasdik-i Gaybî',
        shelfKey: 'BIG',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },

    // --- KÜÇÜK KİTAPLAR (SHELF_SMALL) ---
    {
        bookId: "risale.rnk.ayetkubra_0@diyanet.tr",
        title: "Âyet-ül Kübra",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.bcevab_0@diyanet.tr",
        title: "B.Cevap Veriyor",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.dvan_0@diyanet.tr",
        title: "Divan-ı Harb-i Örfî",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.elhuccet_0@diyanet.tr",
        title: "Elhüccetüzzehra",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.e_nezerre_0@diyanet.tr",
        title: "Ene ve Zerre",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.gencreh_0@diyanet.tr",
        title: "Gençlik Rehberi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.haknurlari_0@diyanet.tr",
        title: "Hakikat Nurları",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.hanimreh_0@diyanet.tr",
        title: "Hanımlar Rehberi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.hasir_0@diyanet.tr",
        title: "Haşir Risalesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.hastalar_0@diyanet.tr",
        title: "Hastalar Risalesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.hizmetreh_0@diyanet.tr",
        title: "Hizmet Rehberi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.hutbe_0@diyanet.tr",
        title: "Hutbe-i Şamiye",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.ihlas_0@diyanet.tr",
        title: "İhlas Risalesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.ikincisua@diyanet.tr",
        title: "İkinci Şua",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.imanhak_0@diyanet.tr",
        title: "İman Hakikatleri",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.konferans_0@diyanet.tr",
        title: "Konferans",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.ksozler_0@diyanet.tr",
        title: "Küçük Sözler",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.latifnukte_0@diyanet.tr",
        title: "Latif Nükteler",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.meyve_0@diyanet.tr",
        title: "Meyve Risalesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.miftah_0@diyanet.tr",
        title: "Miftah-ul İman",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.mirackamer_0@diyanet.tr",
        title: "Mirac ve Şakk-ı Kamer",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.muahmed@diyanet.tr",
        title: "Mu'cizât-ı Ahmediye",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.mukuran@diyanet.tr",
        title: "Mu'cizat-ı Kur'âniye",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.munacat_0@diyanet.tr",
        title: "Münâcât",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.munazarat_0@diyanet.tr",
        title: "Münâzarât",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.nurcesme_0@diyanet.tr",
        title: "Nur Çeşmesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.nuralemi_0@diyanet.tr",
        title: "Nur Aleminin Bir Anahtarı",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.nurilkka_0@diyanet.tr",
        title: "Nur'un İlk Kapısı",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.onucsua@diyanet.tr",
        title: "On Üçüncü Şua",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.otuzuc_0@diyanet.tr",
        title: "Otuzüç Pencere",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.otuzlema@diyanet.tr",
        title: "Otuzuncu Lem'a",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.rahmetsefkat_0@diyanet.tr",
        title: "Rahmet ve Şefkat İlaçları",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.ramazan_0@diyanet.tr",
        title: "Ramazan İktisad Şükür",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.sunuhat_0@diyanet.tr",
        title: "Sünuhat Tüluhat İşârat",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.sunnetseniye@diyanet.tr",
        title: "Sünnet-i Seniyye Ris.",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.tabiat_0@diyanet.tr",
        title: "Tabiat Risalesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.uhuvvet_0@diyanet.tr",
        title: "Uhuvvet Risalesi",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.vesvese@diyanet.tr",
        title: "Vesvese ve Hikmetü'l-İstiâze",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.yirmidortmek@diyanet.tr",
        title: "Yirmi Dördüncü Mektub",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.yirmiuc_0@diyanet.tr",
        title: "Yirmi Üçüncü Söz",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: "risale.rnk.zuhretunnur_0@diyanet.tr",
        title: "Zühret-ün Nur",
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },

    // --- FAYDALI KİTAPLAR (SHELF_FAYDALI) ---
    {
        bookId: 'evrad.tesbihat',
        title: 'Namaz Tesbihatı',
        shelfKey: 'FAYDALI',
        locked: true,
        source: 'custom',
        version: '1.0.0',
        contentRef: { type: 'json', uri: 'asset://books/tesbihat.json', hash: 'generated_v1' },
        coverRef: 'asset://covers/tesbihat.png',
        installedAt: Date.now(),
        updatedAt: Date.now()
    }
];
