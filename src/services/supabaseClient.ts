import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Env } from '@/config/env';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

// Safe Factory to ensure no client is created if Env is invalid.
let clientInstance: SupabaseClient<any, "public", any> | null = null;

export const getSupabaseClient = (): SupabaseClient<any, "public", any> | null => {
    // If Env is invalid, we strictly return null or throw.
    // App.tsx should gate this, but for safety in services:
    if (!Env.isValid) return null;

    if (!clientInstance) {
        clientInstance = createClient(Env.supabaseUrl, Env.supabaseAnonKey, {
            auth: {
                storage: ExpoSecureStoreAdapter,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    }
    return clientInstance;
};
