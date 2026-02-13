/**
 * lruCache.ts
 * Simple LRU (Least Recently Used) cache implementation.
 * Used to cache AI responses to avoid redundant API calls.
 */

export class LRUCache<K, V> {
    private maxSize: number;
    private cache: Map<K, V>;

    /**
     * Creates a new LRU cache.
     * @param maxSize - Maximum number of entries (default: 50)
     */
    constructor(maxSize: number = 50) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    /**
     * Gets a value from the cache.
     * Moves the accessed item to the end (most recently used).
     */
    get(key: K): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // Move to end (most recently used)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    /**
     * Sets a value in the cache.
     * If cache is full, removes the least recently used item.
     */
    set(key: K, value: V): void {
        // If key exists, delete first to update position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove oldest (first) entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, value);
    }

    /**
     * Checks if a key exists in the cache.
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Removes a key from the cache.
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clears all entries from the cache.
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Returns the current size of the cache.
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Returns all keys in the cache (from oldest to newest).
     */
    keys(): K[] {
        return Array.from(this.cache.keys());
    }
}
