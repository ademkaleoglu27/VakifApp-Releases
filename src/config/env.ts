/**
 * Environment Configuration
 * 
 * Centralized access to environment variables with validation.
 * This ensures the app can handle missing configuration gracefully
 * without crashing during bundling or startup.
 */

const RAW_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const RAW_SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validation Logic
const isSupabaseConfigured = (): boolean => {
    // Basic check: must be non-empty strings
    const urlValid = typeof RAW_SUPABASE_URL === 'string' && RAW_SUPABASE_URL.length > 0 && RAW_SUPABASE_URL !== 'undefined';
    const keyValid = typeof RAW_SUPABASE_KEY === 'string' && RAW_SUPABASE_KEY.length > 0 && RAW_SUPABASE_KEY !== 'undefined';
    return urlValid && keyValid;
}

export const Env = {
    supabaseUrl: RAW_SUPABASE_URL || 'https://placeholder-url.supabase.co', // Dummy fallback to prevent type errors
    supabaseAnonKey: RAW_SUPABASE_KEY || 'placeholder-key',

    isValid: isSupabaseConfigured(),

    getMissingKeys: (): string[] => {
        const missing: string[] = [];
        if (!RAW_SUPABASE_URL || RAW_SUPABASE_URL === 'undefined') missing.push('EXPO_PUBLIC_SUPABASE_URL');
        if (!RAW_SUPABASE_KEY || RAW_SUPABASE_KEY === 'undefined') missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
        return missing;
    }
};
