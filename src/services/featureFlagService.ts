/**
 * Feature Flag Service
 * 
 * Vakıf bazlı modül açma/kapama sistemi.
 * Web admin panelden toggle edilen flag'leri Supabase'den çeker,
 * AsyncStorage'da cache'ler ve offline fallback sağlar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/services/supabaseClient';
import { getCurrentVakifId } from '@/store/vakifStore';
import { AppState, AppStateStatus } from 'react-native';

const CACHE_KEY = '@vakifapp/feature-flags';
const FETCH_TIMEOUT_MS = 3000; // 3 saniye timeout

// Feature key'ler — web admin'deki vakif_settings.feature_key ile birebir eşleşmeli
export type FeatureKey =
    | 'ai_assistant'
    | 'mesveret'
    | 'muhasebe'
    | 'education'
    | 'okuma_takibi'
    | 'duyurular'
    | 'nobet_yonetimi'
    | 'gorevlendirmeler'
    | 'kutüphane';

// In-memory cache
let _flags: Record<string, boolean> = {};
let _loaded = false;
let _appStateSubscription: any = null;

/**
 * Supabase'den vakfın feature flag'lerini çeker.
 * Timeout ile korunur (3 saniye).
 */
async function fetchFlagsFromServer(vakifId: string): Promise<Record<string, boolean> | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
        // Timeout ile race
        const result = await Promise.race([
            supabase.rpc('get_vakif_features_rpc', { p_vakif_id: vakifId }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Feature flag fetch timeout')), FETCH_TIMEOUT_MS)
            ),
        ]);

        const { data, error } = result as any;
        if (error) {
            console.warn('[FeatureFlags] Server fetch error:', error.message);
            return null;
        }

        return data as Record<string, boolean>;
    } catch (e: any) {
        console.warn('[FeatureFlags] Fetch failed:', e.message);
        return null;
    }
}

/**
 * AsyncStorage'daki cache'i okur.
 */
async function readCache(): Promise<Record<string, boolean> | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('[FeatureFlags] Cache read error:', e);
    }
    return null;
}

/**
 * Flag'leri AsyncStorage'a yazar.
 */
async function writeCache(flags: Record<string, boolean>): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(flags));
    } catch (e) {
        console.warn('[FeatureFlags] Cache write error:', e);
    }
}

/**
 * Flag'leri yükler. Önce sunucudan dener, başarısız olursa cache kullanır.
 * Hiçbiri yoksa varsayılan: tüm modüller açık.
 */
async function loadFlags(): Promise<void> {
    const vakifId = getCurrentVakifId();

    if (!vakifId) {
        // Misafir kullanıcı — tüm modüller açık varsay
        _flags = {};
        _loaded = true;
        return;
    }

    // Sunucudan çek
    const serverFlags = await fetchFlagsFromServer(vakifId);

    if (serverFlags) {
        _flags = serverFlags;
        _loaded = true;
        await writeCache(serverFlags);
        console.log('[FeatureFlags] Loaded from server:', Object.keys(serverFlags).length, 'flags');
        return;
    }

    // Offline fallback: Cache'den oku
    const cachedFlags = await readCache();
    if (cachedFlags) {
        _flags = cachedFlags;
        _loaded = true;
        console.log('[FeatureFlags] Loaded from cache (offline fallback)');
        return;
    }

    // Hiçbir kaynak yoksa — varsayılan tüm modüller açık
    _flags = {};
    _loaded = true;
    console.log('[FeatureFlags] Using defaults (all enabled)');
}

/**
 * Belirli bir feature'ın aktif olup olmadığını kontrol eder.
 * Flag yoksa veya henüz yüklenmemişse varsayılan: true (güvenli fallback).
 */
function isFeatureEnabled(featureKey: FeatureKey): boolean {
    if (!_loaded) {
        // Henüz yüklenmedi — güvenli fallback: açık
        return true;
    }

    // Flag tanımlı değilse → varsayılan açık
    return _flags[featureKey] ?? true;
}

/**
 * Cache'i ve in-memory flag'leri temizler (logout sırasında çağrılmalı).
 */
async function clearFlags(): Promise<void> {
    _flags = {};
    _loaded = false;
    try {
        await AsyncStorage.removeItem(CACHE_KEY);
    } catch (e) {
        // ignore
    }
}

/**
 * AppState dinleyicisi: Uygulama arka plan → ön plan geçişinde flag'leri yeniden çeker.
 * Risk mitigasyonu: Admin toggle'ı kapatır, kullanıcı uygulamayı tekrar açınca güncellenir.
 */
function startAppStateListener(): void {
    if (_appStateSubscription) return; // Zaten dinleniyor

    _appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            // Ön plana geldi — arka planda flag'ler yenile
            loadFlags().catch(e => console.warn('[FeatureFlags] Background refresh failed:', e));
        }
    });
}

/**
 * AppState dinleyicisini durdurur (logout sırasında).
 */
function stopAppStateListener(): void {
    if (_appStateSubscription) {
        _appStateSubscription.remove();
        _appStateSubscription = null;
    }
}

export const featureFlagService = {
    loadFlags,
    isFeatureEnabled,
    clearFlags,
    startAppStateListener,
    stopAppStateListener,
};
