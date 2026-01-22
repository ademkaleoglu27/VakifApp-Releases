import { SEED_LOCKED_BOOKS } from './seedData';

// --- TYPES ---

export type ShelfKey = 'TOP' | 'CEVSEN' | 'LUGAT' | 'FAYDALI' | 'BIG' | 'SMALL';
export type BookSource = 'core' | 'diyanet' | 'custom' | 'dev';
export type LibraryItemKind = 'quran' | 'cevsen' | 'lugat' | 'big' | 'small' | 'html_dev' | 'other';

export interface BookContentRef {
    type: 'db' | 'json' | 'pack';
    uri: string;
    hash: string;
}

export interface BookRecord {
    bookId: string;
    title: string;
    shelfKey: ShelfKey;
    locked: boolean;
    source: BookSource;
    version: string;
    contentRef: BookContentRef;
    coverRef?: string;
    installedAt: number;
    updatedAt: number;
    devOnly?: boolean;
}

export interface BookManifest {
    bookId: string;
    title: string;
    shelfKey: ShelfKey;
    version?: string;
    contentRef: BookContentRef;
    coverRef?: string;
    devOnly?: boolean;
}

export interface InstallationResult {
    success: boolean;
    action: 'INSTALLED' | 'UPDATED' | 'NO_OP' | 'BLOCKED_LOCKED' | 'ERROR';
    message?: string;
}

// --- REGISTRY ---

class LibraryRegistry {
    private static instance: LibraryRegistry;
    private _books: Map<string, BookRecord> = new Map();
    private _isInitialized = false;

    private constructor() { }

    public static getInstance(): LibraryRegistry {
        if (!LibraryRegistry.instance) {
            LibraryRegistry.instance = new LibraryRegistry();
        }
        return LibraryRegistry.instance;
    }

    /**
     * Initialize the registry with seeded data + persistent data
     */
    public async init() {
        if (this._isInitialized) return;

        console.log('[LibraryRegistry] Initializing...');

        // 1. Load SEED data (Locked Books)
        // This ensures Big/Small books are ALWAYS present and correct
        for (const seedBook of SEED_LOCKED_BOOKS) {
            this._books.set(seedBook.bookId, seedBook);
        }

        console.log(`[LibraryRegistry] Seeded ${SEED_LOCKED_BOOKS.length} locked books.`);

        // 2. TODO: Load dynamic books from AsyncStorage/SQLite
        // For now, we only have seed books, which is fine for this step.

        this._isInitialized = true;
    }

    /**
     * Transactional Book Installation
     */
    public installBook(manifest: BookManifest): InstallationResult {
        const { bookId, contentRef } = manifest;

        console.log(`[LibraryRegistry] install_start(${bookId})`);

        const existing = this._books.get(bookId);

        if (existing) {
            // A) LOCKED PROTECTION
            if (existing.locked) {
                console.warn(`[LibraryRegistry] install_blocked_locked(${bookId})`);
                return {
                    success: false,
                    action: 'BLOCKED_LOCKED',
                    message: `Cannot update locked book: ${bookId}`
                };
            }

            // B) IDEMPOTENCY CHECK
            if (existing.contentRef.hash === contentRef.hash) {
                console.log(`[LibraryRegistry] install_noop(${bookId}) - Hash match`);
                return {
                    success: true,
                    action: 'NO_OP',
                    message: 'Content hash identical, no changes made.'
                };
            }

            // C) UPDATE CANDIDATE (Not implemented fully yet, just overwrite for non-locked)
            console.log(`[LibraryRegistry] install_update(${bookId})`);
            const updatedRecord: BookRecord = {
                ...existing,
                ...manifest,
                version: manifest.version || existing.version,
                updatedAt: Date.now()
            };
            this._books.set(bookId, updatedRecord);
            return {
                success: true,
                action: 'UPDATED',
                message: 'Book updated successfully.'
            };
        }

        // D) NEW INSTALL
        console.log(`[LibraryRegistry] install_commit_ok(${bookId})`);

        const newRecord: BookRecord = {
            bookId: manifest.bookId,
            title: manifest.title,
            shelfKey: manifest.shelfKey,
            locked: false, // New books are never locked by default
            source: 'custom',
            version: manifest.version || '1.0.0',
            contentRef: manifest.contentRef,
            coverRef: manifest.coverRef,
            installedAt: Date.now(),
            updatedAt: Date.now(),
            devOnly: manifest.devOnly
        };

        this._books.set(bookId, newRecord);
        return {
            success: true,
            action: 'INSTALLED'
        };
    }

    /**
     * Get all books, optionally filtered
     */
    public getAllBooks(includeDev = false): BookRecord[] {
        const all = Array.from(this._books.values());
        if (includeDev) return all;
        return all.filter(b => !b.devOnly);
    }

    /**
     * Get books by Shelf
     */
    public getBooksByShelf(shelf: ShelfKey, includeDev = false): BookRecord[] {
        const books = this.getAllBooks(includeDev);
        return books
            .filter(b => b.shelfKey === shelf)
        // Sort by logic can be added here (e.g. order index)
        // For Big/Small, we might rely on the Seed order or add an order field
        // Currently preserving insertion order from Seed is enough for Big/Small
    }

    /**
     * Get a specific book
     */
    public getBookById(bookId: string): BookRecord | undefined {
        return this._books.get(bookId);
    }
}

export const libraryRegistry = LibraryRegistry.getInstance();
