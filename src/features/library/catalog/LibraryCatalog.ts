// LibraryCatalog.ts - Single source of truth for library items
import { ImageSourcePropType } from 'react-native';

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

// Static catalog items (Kur'an, Cevşen, Lugat, etc.)
const STATIC_ITEMS: LibraryItem[] = [
    {
        id: 'quran-kerim',
        title: "Kur'an-ı Kerim",
        subtitle: 'Diyanet Meali',
        kind: 'quran',
        status: 'preparing',
        openAction: {
            type: 'route',
            routeName: 'QuranHomeScreen',
            params: {}
        }
    },
    {
        id: 'cevsen',
        title: 'Cevşen',
        subtitle: 'Cevşenü\'l-Kebir',
        kind: 'cevsen',
        status: 'preparing',
        openAction: {
            type: 'route',
            routeName: 'CevsenLanding',
            params: {}
        }
    },
    {
        id: 'mealli-cevsen',
        title: 'Mealli Cevşen',
        kind: 'cevsen',
        status: 'preparing',
        openAction: {
            type: 'route',
            routeName: 'CevsenLanding',
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

// Mutable catalog that gets populated with adapters
let _catalogItems: LibraryItem[] = [...STATIC_ITEMS];

export const LibraryCatalog = {
    /**
     * Register additional items (from adapters)
     */
    registerItems(items: LibraryItem[]) {
        // Filter duplicates by id
        const existingIds = new Set(_catalogItems.map(i => i.id));
        const newItems = items.filter(i => !existingIds.has(i.id));
        _catalogItems = [..._catalogItems, ...newItems];
    },

    /**
     * Get all items
     */
    getAllItems(): LibraryItem[] {
        return _catalogItems;
    },

    /**
     * Get items by kind
     */
    getItemsByKind(kind: LibraryItemKind): LibraryItem[] {
        return _catalogItems.filter(item => item.kind === kind);
    },

    /**
     * Get shelves for a specific tab
     */
    getShelves(tab: 'quran_evrad' | 'big' | 'small'): Shelf[] {
        // Filter out chapter items (they start with 'chapter-')
        const bookItems = _catalogItems.filter(i => !i.id.startsWith('chapter-'));

        switch (tab) {
            case 'quran_evrad':
                return [
                    {
                        id: 'quran-hero',
                        title: '',
                        items: bookItems.filter(i => i.kind === 'quran'),
                        style: 'hero'
                    },
                    {
                        id: 'cevsen-shelf',
                        title: 'Cevşen',
                        items: bookItems.filter(i => i.kind === 'cevsen'),
                        style: 'standard'
                    },
                    {
                        id: 'lugat-shelf',
                        title: 'Lügat',
                        items: bookItems.filter(i => i.kind === 'lugat'),
                        style: 'standard'
                    }
                ];
            case 'big':
                return [
                    {
                        id: 'big-books',
                        title: 'Büyük Kitaplar',
                        items: bookItems.filter(i => i.kind === 'big'),
                        style: 'standard'
                    }
                ];
            case 'small':
                return [
                    {
                        id: 'small-books',
                        title: 'Küçük Kitaplar',
                        items: bookItems.filter(i => i.kind === 'small'),
                        style: 'standard'
                    }
                ];
            default:
                return [];
        }
    },

    /**
     * Search items by title (books and chapters) - Turkish locale aware
     */
    search(query: string): LibraryItem[] {
        const q = query.toLocaleLowerCase('tr-TR').trim();
        if (!q || q.length < 2) return [];

        const results = _catalogItems.filter(item => {
            const titleLower = item.title.toLocaleLowerCase('tr-TR');
            const subtitleLower = item.subtitle?.toLocaleLowerCase('tr-TR') || '';
            return titleLower.includes(q) || subtitleLower.includes(q);
        });

        // Sort: books first, then chapters; limit to 30 results
        return results
            .sort((a, b) => {
                const aIsBook = a.id.startsWith('html-');
                const bIsBook = b.id.startsWith('html-');
                if (aIsBook && !bIsBook) return -1;
                if (!aIsBook && bIsBook) return 1;
                return 0;
            })
            .slice(0, 30);
    },

    /**
     * Get item by ID
     */
    getItemById(id: string): LibraryItem | undefined {
        return _catalogItems.find(item => item.id === id);
    },

    /**
     * Debug: get catalog size
     */
    getSize(): number {
        return _catalogItems.length;
    }
};
