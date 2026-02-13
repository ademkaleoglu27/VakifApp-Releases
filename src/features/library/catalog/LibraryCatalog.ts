// LibraryCatalog.ts - Single source of truth for library items
import { ImageSourcePropType } from 'react-native';
import { libraryRegistry, ShelfKey } from '../LibraryRegistry';
import { expandNumbersInQuery } from '@/services/ai-assist/numberNormalize';

export type LibraryItemKind = 'quran' | 'cevsen' | 'lugat' | 'big' | 'small' | 'html_dev' | 'other';
export type LibraryItemStatus = 'ready' | 'preparing' | 'disabled';

export interface LibraryItem {
    id: string;
    title: string;
    subtitle?: string;
    cover?: ImageSourcePropType | string;
    kind: LibraryItemKind;
    status: LibraryItemStatus;
    openAction: {
        type: 'route';
        routeName: string;
        params?: Record<string, any>;
    };
}

export interface Shelf {
    id: string;
    title: string;
    items: LibraryItem[];
    style?: 'hero' | 'standard';
}

// Static catalog items (Kur'an, Cevşen, Lugat, etc.) - Legacy until fully migrated to Registry
const STATIC_ITEMS: LibraryItem[] = [
    {
        id: 'quran@vakifapp',
        title: "Kur'an-ı Kerim",
        subtitle: 'Meal, Transliterasyon & Ses',
        // cover: require('../../../../assets/covers/quran.png'),
        kind: 'quran',
        status: 'ready',
        openAction: {
            type: 'route',
            routeName: 'QuranTextMenuScreen',
            params: {}
        }
    },
    {
        id: 'cevsen',
        title: 'Cevşen',
        subtitle: 'Cevşenü\'l-Kebir',
        kind: 'cevsen',
        status: 'ready',
        openAction: {
            type: 'route',
            routeName: 'CevsenScreen',
            params: {}
        }
    },

    {
        id: 'celcelutiye',
        title: 'Celcelutiye',
        kind: 'cevsen',
        status: 'preparing',
        openAction: {
            type: 'route',
            routeName: 'CevsenLanding',
            params: {}
        }
    },
    {
        id: 'lugat',
        title: 'Hayrat Lügat',
        subtitle: 'Osmanlıca-Türkçe',
        kind: 'lugat',
        status: 'preparing',
        openAction: {
            type: 'route',
            routeName: 'Lugat',
            params: {}
        }
    }
];

// Mutable storage for search-only items (chapters, etc.)
let _extraSearchItems: LibraryItem[] = [];

// Initialize Registry
libraryRegistry.init();

export const LibraryCatalog = {
    /**
     * Get all items (Merging Legacy Static + Registry Items)
     * Note: This does NOT include _extraSearchItems (chapters) to keep shelves clean
     */
    getAllItems(): LibraryItem[] {
        const registryBooks = libraryRegistry.getAllBooks();
        const registryItems = registryBooks.map(book => this._mapRecordToItem(book));
        return [...STATIC_ITEMS, ...registryItems];
    },

    /**
     * Get shelves for a specific tab
     */
    getShelves(tab: 'quran_evrad' | 'big' | 'small'): Shelf[] {
        switch (tab) {
            case 'quran_evrad':
                return [
                    {
                        id: 'quran-hero',
                        title: '',
                        items: STATIC_ITEMS.filter(i => i.kind === 'quran'),
                        style: 'hero'
                    },
                    {
                        id: 'cevsen-shelf',
                        title: 'Cevşen',
                        items: STATIC_ITEMS.filter(i => i.kind === 'cevsen'),
                        style: 'standard'
                    },
                    {
                        id: 'faydali-shelf',
                        title: 'Faydalı Kitaplar',
                        // Map 'FAYDALI' books from Registry
                        items: libraryRegistry.getBooksByShelf('FAYDALI').map(b => this._mapRecordToItem(b, 'cevsen')), // using 'cevsen' kind for similar styling
                        style: 'standard'
                    },
                    {
                        id: 'lugat-shelf',
                        title: 'Lügat',
                        items: STATIC_ITEMS.filter(i => i.kind === 'lugat'),
                        style: 'standard'
                    }
                ];
            case 'big':
                return [
                    {
                        id: 'big-books',
                        title: 'Büyük Kitaplar',
                        items: libraryRegistry.getBooksByShelf('BIG').map(b => this._mapRecordToItem(b, 'big')),
                        style: 'standard'
                    }
                ];
            case 'small':
                return [
                    {
                        id: 'small-books',
                        title: 'Küçük Kitaplar',
                        items: libraryRegistry.getBooksByShelf('SMALL').map(b => this._mapRecordToItem(b, 'small')),
                        style: 'standard'
                    }
                ];
            default:
                return [];
        }
    },

    /**
     * Search items by title with variant matching
     * 
     * Pipeline:
     * 1. Try raw query first (exact case-insensitive match)
     * 2. If no results, try normalized variants (diacritics removed)
     * 3. Return combined unique results
     */
    search(query: string): LibraryItem[] {
        const rawQuery = query.trim();
        if (!rawQuery || rawQuery.length < 2) return [];

        const allItems = [...this.getAllItems(), ..._extraSearchItems];

        // DEBUG LOG (DEV only)
        if (__DEV__) {
            console.log('[LibraryCatalog.search] ───────────────────');
            console.log('  rawQuery:', rawQuery);
        }

        // Helper: Normalize for diacritic-insensitive matching
        const normalizeTurkish = (s: string): string => {
            return s
                .toLocaleLowerCase('tr-TR')
                .replace(/[âāà]/g, 'a')
                .replace(/[îīì]/g, 'i')
                .replace(/[ûūù]/g, 'u')
                .replace(/[êēè]/g, 'e')
                .replace(/[ôōò]/g, 'o')
                .replace(/[''ʿʾ`´ʼ]/g, ''); // Remove apostrophes
        };

        // 1. Try exact match with rawQuery (case-insensitive)
        const rawLower = rawQuery.toLocaleLowerCase('tr-TR');
        let results = allItems.filter(item => {
            const titleLower = item.title.toLocaleLowerCase('tr-TR');
            const subtitleLower = item.subtitle?.toLocaleLowerCase('tr-TR') || '';
            return titleLower.includes(rawLower) || subtitleLower.includes(rawLower);
        });

        if (__DEV__) {
            console.log('  rawQuery results:', results.length);
        }

        // 2. If no results, try with number-expanded query (e.g., "4.söz" → "dördüncü söz")
        if (results.length === 0) {
            const expandedQuery = expandNumbersInQuery(rawQuery).toLocaleLowerCase('tr-TR');

            if (expandedQuery !== rawLower) {
                if (__DEV__) {
                    console.log('  expandedQuery:', expandedQuery);
                }

                results = allItems.filter(item => {
                    const titleLower = item.title.toLocaleLowerCase('tr-TR');
                    const subtitleLower = item.subtitle?.toLocaleLowerCase('tr-TR') || '';
                    return titleLower.includes(expandedQuery) || subtitleLower.includes(expandedQuery);
                });

                if (__DEV__) {
                    console.log('  expanded results:', results.length);
                }
            }
        }

        // 2. If no results, try with diacritic-normalized query
        if (results.length === 0) {
            const normalizedQuery = normalizeTurkish(rawQuery);

            if (__DEV__) {
                console.log('  normalizedQuery:', normalizedQuery);
            }

            results = allItems.filter(item => {
                const titleNorm = normalizeTurkish(item.title);
                const subtitleNorm = item.subtitle ? normalizeTurkish(item.subtitle) : '';
                return titleNorm.includes(normalizedQuery) || subtitleNorm.includes(normalizedQuery);
            });

            if (__DEV__) {
                console.log('  normalized results:', results.length);
            }
        }

        // 3. Deduplicate by ID and limit
        const seen = new Set<string>();
        const uniqueResults = results.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });

        if (__DEV__) {
            console.log('  final results:', uniqueResults.length);
            console.log('───────────────────────────────────────');
        }

        return uniqueResults.slice(0, 30);
    },

    /**
     * Helper to map Registry Record to UI Item
     */
    _mapRecordToItem(record: any, forceKind?: LibraryItemKind): LibraryItem {
        return {
            id: record.bookId, // Use bookId as the UI ID
            title: record.title,
            subtitle: '', // TODO: Add subtitle if available in record
            kind: forceKind || (record.shelfKey === 'BIG' ? 'big' : 'small'),
            status: 'ready',
            openAction: {
                type: 'route',
                routeName: record.bookId === 'evrad.tesbihat' ? 'TesbihatScreen' : 'RisaleHtmlReaderHome',
                params: {
                    bookId: record.bookId,
                    title: record.title
                }
            }
        };
    },

    // Compatibility methods for old adapters if needed
    registerItems(items: LibraryItem[]) {
        // Only accept "chapter" items or items that are NOT books managed by registry
        // This keeps the search index populated with chapters
        const extraItems = items.filter(i => i.id.startsWith('chapter-'));

        if (extraItems.length > 0) {
            const existingIds = new Set(_extraSearchItems.map(i => i.id));
            const newItems = extraItems.filter(i => !existingIds.has(i.id));
            _extraSearchItems = [..._extraSearchItems, ...newItems];
            console.log(`[LibraryCatalog] Registered ${newItems.length} extra search items (chapters).`);
        }
    }
};
