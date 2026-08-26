import * as SecureStore from 'expo-secure-store';
import { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseMigration } from './databaseMigration';
import { ContentHealthGate } from './contentHealthGate';
import { backfillSozlerSectionUid } from './backfill/sozlerSectionUidBackfill';

const SELF_HEAL_KEY = 'content_selfheal_attempted';

export const ContentSelfHeal = {
    /**
     * Checks if self-heal has effectively been exhausted.
     * We allow 1 attempt per app install/session cycle effectively.
     */
    async hasAttemptedSelfHeal(): Promise<boolean> {
        return (await SecureStore.getItemAsync(SELF_HEAL_KEY)) === 'true';
    },

    async resetSelfHealStatus(): Promise<void> {
        await SecureStore.deleteItemAsync(SELF_HEAL_KEY);
    },

    /**
     * Attempts to repair the database one time.
     */
    async attemptSelfHeal(db: SQLiteDatabase): Promise<boolean> {
        console.log('[ContentSelfHeal] Starting self-heal sequence...');

        // 1. Check Guard
        if (await this.hasAttemptedSelfHeal()) {
            console.warn('[ContentSelfHeal] Self-heal already attempted. Aborting to avoid loops.');
            return false;
        }

        try {
            // Mark as running/attempted immediately to prevent recursive calls
            await SecureStore.setItemAsync(SELF_HEAL_KEY, 'true');

            // 2. Diagnose
            const health = await ContentHealthGate.checkContentHealth(db);
            if (health.isHealthy) {
                console.log('[ContentSelfHeal] DB is actually healthy. No repair needed.');
                return true;
            }

            console.log(`[ContentSelfHeal] Repairing error: ${health.error}`);

            // 3. Repair Strategy
            if (health.error === 'ERR_SCHEMA_VERSION_LOW' || health.error === 'ERR_UID_NULL') {
                // Strategy A: Run Migrations + Backfill
                console.log('[ContentSelfHeal] Running migrations and backfill...');
                // Force V2 migration explicitly if needed, but migrateIfNeeded handles it
                await DatabaseMigration.migrateIfNeeded(db);
                // Force backfill specifically
                await backfillSozlerSectionUid(db);
            }

            if (health.error === 'ERR_SOZLER_MISSING' || health.error === 'ERR_DB_INTEGRITY_FAIL') {
                // Strategy B: Critical Content Missing OR Integrity Fail
                // LOCKDOWN: No auto-reinstall. Only manual.
                console.warn(`[ContentSelfHeal] Critical error (${health.error}). Auto-heal BLOCKED by lockdown rules.`);
                return false;
            }

            // 4. Final Verify
            // Note: If we had duplicate UIDs or other errors, we currently don't fix them automatically.
            const finalHealth = await ContentHealthGate.checkContentHealth(db);
            console.log(`[ContentSelfHeal] Post-repair health: ${finalHealth.isHealthy}`);

            return finalHealth.isHealthy;

        } catch (error) {
            console.error('[ContentSelfHeal] Repair failed:', error);
            return false;
        }
    }
};
