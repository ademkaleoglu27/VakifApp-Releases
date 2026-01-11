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
    },
    // Future books (disabled until data is ready):
    // {
    //     id: 'mektubat',
    //     title: 'Mektubat',
    //     icon: 'mail-outline',
    //     enabled: false,
    // },
    // {
    //     id: 'lemalar',
    //     title: "Lem'alar",
    //     icon: 'flash-outline',
    //     enabled: false,
    // },
    // {
    //     id: 'sualar',
    //     title: "Şualar",
    //     icon: 'sunny-outline',
    //     enabled: false,
    // },
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
