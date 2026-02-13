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

// ============================================================================
// AI ASSIST FALLBACK LAYER - v1.0
// ============================================================================
// These flags control the AI-powered fallback features for Lugat and Search.
// The system is designed to be fail-safe: when flags are off, the app behaves
// exactly as before with no UI changes.

// AI-powered explanation for Lugat (requires API key and network)
// When disabled: Only local suggestions are shown
export const ENABLE_AI_ASSIST_LUGAT = false;

// AI-powered suggestions for Search (requires API key and network)
// When disabled: Only alias-based suggestions are shown
export const ENABLE_AI_ASSIST_SEARCH = false;

// Local fuzzy suggestions for Lugat (no network required)
// When enabled: Shows "Öneriler" section with normalized/fuzzy matches
export const ENABLE_LUGAT_SUGGESTIONS = true;

// Local alias-based suggestions for Search (no network required)
// When enabled: Shows alternative query chips based on aliasMap
export const ENABLE_SEARCH_SUGGESTIONS = true;

// ============================================================================
// UI COMPONENT FLAGS
// ============================================================================

// Use the new tabbed LugatPopup component instead of legacy inline modal
// When false: Uses enhanced legacy modal with local suggestions
// When true: Uses new LugatPopup.tsx (AI tab will be hidden since AI is disabled)
export const USE_NEW_LUGAT_POPUP = false;

