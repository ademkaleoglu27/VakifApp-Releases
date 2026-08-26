import { ensureContentDbReady } from './contentDb';

/**
 * RisaleAssets Service (Legacy Wrapper)
 * 
 * Formerly managed JSON assets/PDFs.
 * Now acts as a facade for the ContentDB system which uses assets/risale.db as the Single Source of Truth.
 * 
 * Flow:
 * 1. App.tsx calls RisaleAssets.init()
 * 2. We delegate to ensureContentDbReady() which:
 *    - Checks content.meta.json (bundled) vs installed.
 *    - Installs/Updates assets/risale.db if version changed.
 *    - Runs DatabaseMigration + SelfHeal.
 */

export const RisaleAssets = {
    async init(): Promise<void> {
        // Delegate to the robust ContentDB mechanism
        // This ensures the DB is ready and up to date based on bundled metadata.
        try {
            await ensureContentDbReady();
        } catch (e) {
            console.error('[RisaleAssets] Init failed via ContentDb delegation:', e);
        }
    },

    /**
     * @deprecated JSON assets are removed from production builds.
     * Use ContentDb (SQLite) for all queries.
     */
    getJsonPath(filename: string): string {
        console.warn('[RisaleAssets] getJsonPath deprecated. JSON assets not available.');
        return '';
    },

    /**
     * @deprecated Use ContentHealthGate.loadFingerprint() or check DB directly.
     */
    async getMeta(): Promise<any> {
        console.warn('[RisaleAssets] getMeta deprecated.');
        return null;
    },

    async ensureDirectories() {
        // No-op
    },

    async deployAssets() {
        // No-op
    }
};
