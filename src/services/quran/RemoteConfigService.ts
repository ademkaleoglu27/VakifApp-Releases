import { getSupabaseClient } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@system_config/quran_reader_mode';
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export type QuranReaderMode = 'image' | 'pdf';

export const RemoteConfigService = {
    async getQuranReaderMode(): Promise<QuranReaderMode> {
        try {
            // 1. Check Cache first
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            const cacheTime = await AsyncStorage.getItem(CACHE_KEY + '_time');

            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime, 10);
                if (age < CACHE_TTL) {
                    return cached as QuranReaderMode;
                }
            }

            // 2. Fetch from Supabase
            const supabase = getSupabaseClient();
            if (!supabase) return 'image'; // Default to image if supabase is not ready

            const { data, error } = await supabase
                .from('system_config')
                .select('value')
                .eq('key', 'quran_reader_mode')
                .single();

            if (error || !data) {
                console.warn('[RemoteConfig] Failed to fetch remote config:', error);
                return 'image';
            }

            const mode = data.value as QuranReaderMode;

            // 3. Update Cache
            await AsyncStorage.setItem(CACHE_KEY, mode);
            await AsyncStorage.setItem(CACHE_KEY + '_time', Date.now().toString());

            return mode;
        } catch (e) {
            console.error('[RemoteConfig] Error fetching config:', e);
            return 'image'; // Fail safe to default
        }
    }
};
