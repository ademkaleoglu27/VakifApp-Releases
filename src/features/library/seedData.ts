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
        bookId: 'risale.sunuhat@diyanet.tr',
        title: 'Sünuhat',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.isarat_k@diyanet.tr',
        title: 'İşarat',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.tuluat@diyanet.tr',
        title: 'Tulûat',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.nurcesmesi@diyanet.tr',
        title: 'Nur Çeşmesi',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.divaniharbi@diyanet.tr',
        title: 'Divan-ı Harb-i Örfî',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.hutbe@diyanet.tr',
        title: 'Hutbe-i Şamiye',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.munazarat@diyanet.tr',
        title: 'Münazarat',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.genclik@diyanet.tr',
        title: 'Gençlik Rehberi',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.hanimlar@diyanet.tr',
        title: 'Hanımlar Rehberi',
        shelfKey: 'SMALL',
        locked: true,
        source: 'core',
        version: '1.0.0',
        contentRef: { type: 'pack', uri: 'html_manifest', hash: 'locked_core_v1' },
        installedAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        bookId: 'risale.konferans@diyanet.tr',
        title: 'Konferans',
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
        installedAt: Date.now(),
        updatedAt: Date.now()
    }
];
