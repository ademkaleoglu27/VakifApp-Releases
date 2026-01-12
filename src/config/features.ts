/**
 * features.ts
 * Feature flags for the application.
 * Use this to toggle features on/off globally.
 */

// V25.4: CRITICAL STABILITY ROLLBACK
// Disable "Resume / Last Read" feature to restore reader stability.
// - Hides "Kaldığın Yer" in TOC
// - Disables saving last position
// - Rejects 'resume' mode in Reader
export const ENABLE_RESUME_LAST_READ = false;
