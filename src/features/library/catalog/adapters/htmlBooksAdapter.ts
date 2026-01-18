// htmlBooksAdapter.ts - Maps HTML_BOOKS to LibraryCatalog format
import { HTML_BOOKS, HtmlBook } from '@/features/reader/html/htmlManifest.generated';
import { LibraryItem, LibraryCatalog } from '../LibraryCatalog';

// Track if already initialized
let isInitialized = false;

/**
 * Convert HTML_BOOKS from manifest to LibraryItem format
 */
function adaptHtmlBooks(): LibraryItem[] {
    const bookIds = Object.keys(HTML_BOOKS);
    console.log(`[htmlBooksAdapter] Found ${bookIds.length} books in HTML_BOOKS`);

    const items: LibraryItem[] = [];

    for (const bookId of bookIds) {
        const book = HTML_BOOKS[bookId];

        // Determine kind based on category
        let kind: LibraryItem['kind'] = 'html_dev';
        if (book.category === 'Büyük Kitaplar') {
            kind = 'big';
        } else if (book.category === 'Küçük Kitaplar') {
            kind = 'small';
        }

        // Add book as catalog item
        items.push({
            id: `html-${book.id}`,
            title: book.title,
            subtitle: `${book.chapters.length} bölüm`,
            kind,
            status: 'ready' as const,
            openAction: {
                type: 'route' as const,
                routeName: 'RisaleHtmlReaderHome',
                params: {
                    bookId: book.id,
                    title: book.title
                }
            }
        });

        // Also add each chapter as a searchable item
        for (const chapter of book.chapters) {
            items.push({
                id: `chapter-${chapter.id}`,
                title: chapter.title.replace(/^\d+\s*/, ''), // Remove leading numbers
                subtitle: book.title,
                kind,
                status: 'ready' as const,
                openAction: {
                    type: 'route' as const,
                    routeName: 'RisaleHtmlReader',
                    params: {
                        assetPath: chapter.assetPath,
                        title: chapter.title,
                        bookId: book.id
                    }
                }
            });
        }
    }

    return items;
}

/**
 * Initialize and register HTML books to the catalog
 */
export function initializeHtmlBooksAdapter() {
    if (isInitialized) {
        console.log('[htmlBooksAdapter] Already initialized, skipping');
        return;
    }

    const items = adaptHtmlBooks();
    LibraryCatalog.registerItems(items);
    isInitialized = true;
    console.log(`[htmlBooksAdapter] Registered ${items.length} items (books + chapters)`);
}

/**
 * Get navigation params for a specific HTML book
 */
export function getHtmlBookParams(bookId: string) {
    const book = HTML_BOOKS[bookId];
    if (!book) return null;

    return {
        bookId: book.id,
        title: book.title,
        chapters: book.chapters
    };
}
