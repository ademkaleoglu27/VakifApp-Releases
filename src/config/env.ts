/**
 * Environment Configuration
 * 
 * Centralized access to environment variables with validation.
 * Includes embedded defaults to ensure complete standalone reliability.
 */

const RAW_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kyyvkmvdqvjpjfqfvnro.supabase.co';
const RAW_SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_RkrBXJQo6pnTTvvF0C875A_1RAzcZa2';
const RAW_GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// Validation Logic
const isSupabaseConfigured = (): boolean => {
    const urlValid = typeof RAW_SUPABASE_URL === 'string' && RAW_SUPABASE_URL.length > 0 && !RAW_SUPABASE_URL.includes('placeholder');
    const keyValid = typeof RAW_SUPABASE_KEY === 'string' && RAW_SUPABASE_KEY.length > 0 && !RAW_SUPABASE_KEY.includes('placeholder');
    return urlValid && keyValid;
};

export const Env = {
    supabaseUrl: RAW_SUPABASE_URL,
    supabaseAnonKey: RAW_SUPABASE_KEY,
    geminiApiKey: RAW_GEMINI_KEY,

    isValid: isSupabaseConfigured(),

    getMissingKeys: (): string[] => {
        const missing: string[] = [];
        if (!RAW_SUPABASE_URL || RAW_SUPABASE_URL.includes('placeholder')) missing.push('EXPO_PUBLIC_SUPABASE_URL');
        if (!RAW_SUPABASE_KEY || RAW_SUPABASE_KEY.includes('placeholder')) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
        return missing;
    }
};
