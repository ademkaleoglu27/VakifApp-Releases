/**
 * Config Integrity Checker
 * 
 * Verifies that all enabled books have valid configuration entries.
 * Runs only in DEV mode to catch configuration errors early.
 * 
 * @packageDocumentation
 */

import { canonicalizeBookId } from './bookId';
import { CONTENT_PACK_CONFIG, getEnabledBooks } from '@/config/booksRegistry';

export function checkConfigIntegrity(): void {
    if (!__DEV__) return;

    // Only run if not in CI to keep tests clean
    if (process.env.CI === 'true') return;

    console.log('[ConfigIntegrity] Starting check...');
    const missing: Array<{ id: string, canon: string }> = [];
    const warnings: Array<string> = [];

    // 1. Check all enabled books in registry
    const enabledBooks = getEnabledBooks();

    enabledBooks.forEach(book => {
        const canonicalId = canonicalizeBookId(book.id);
        const config = CONTENT_PACK_CONFIG[canonicalId];

        if (!config) {
            // Collect missing configs instead of erroring immediately
            missing.push({ id: book.id, canon: canonicalId });
            return;
        }

        // 2. Check download URLs
        if (config.contentMode === 'downloadable') {
            if (!config.downloadUrl) {
                warnings.push(`Missing downloadUrl for ${canonicalId}`);
            } else if (!config.downloadUrl.includes('/releases/download/')) {
                warnings.push(`Invalid downloadUrl for ${canonicalId} (no /releases/download/)`);
            }
        }
    });

    // Report results
    if (missing.length > 0) {
        console.warn(`[ConfigIntegrity] Missing configs (${missing.length}):`, missing);
    }

    if (warnings.length > 0) {
        console.warn(`[ConfigIntegrity] Config warnings (${warnings.length}):`, warnings);
    }

    if (missing.length === 0 && warnings.length === 0) {
        console.log('[ConfigIntegrity] ✅ All checks passed');
    }
}
