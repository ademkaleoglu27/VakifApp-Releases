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

// V27.3: ICARZ PROTOCOL GENERALIZATION
// Applies the "Gold Standard" Icarz protocol (Zoom, Grid, 3-Page Hydration, Layout Gate, Lugat Top-Positioning)
// to ALL books in the application.
// This also stabilizes interactions by enforcing "Tap-to-Lookup" (Legacy) and disabling experimental token interactions.
export const ENABLE_ICARZ_PROTOCOL_FOR_ALL_BOOKS = true;
