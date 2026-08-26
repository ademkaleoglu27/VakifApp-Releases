import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from '@/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ensureContentDbReady } from '@/services/contentDb';
import { RisaleAssets } from '@/services/risaleAssets';
import { initDb as initOfflineDb } from '@/services/db/sqlite';
import { View, ActivityIndicator, Text } from 'react-native';
import { NotificationProvider } from '@/context/NotificationsContext';
import { useFonts } from 'expo-font';
import { ContentIntegrityScreen } from '@/screens/ContentIntegrityScreen';
import { OTAUpdateManager } from '@/components/OTAUpdateManager';
import { Env } from '@/config/env';
import { syncDynamicAliases } from '@/services/lugat_aliases';
import { featureFlagService } from '@/services/featureFlagService';
import { networkSyncWatcher } from '@/services/networkSyncWatcher';
import { OfflineSyncBadge } from '@/components/OfflineSyncBadge';
import * as ScreenOrientation from 'expo-screen-orientation';

// Google Fonts Imports
import {
  CrimsonPro_400Regular,
  CrimsonPro_600SemiBold,
  CrimsonPro_400Regular_Italic
} from '@expo-google-fonts/crimson-pro';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { PirataOne_400Regular } from '@expo-google-fonts/pirata-one';
import { GermaniaOne_400Regular } from '@expo-google-fonts/germania-one';
import { Tinos_400Regular, Tinos_700Bold, Tinos_400Regular_Italic } from '@expo-google-fonts/tinos';
import { ScheherazadeNew_400Regular, ScheherazadeNew_700Bold } from '@expo-google-fonts/scheherazade-new';

// React Query Client oluştur
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Load custom fonts with error fallback
  const [fontsLoaded, fontError] = useFonts({
    // Local legacy fonts
    LivaNur: require('./assets/fonts/LivaNur.ttf'),
    SouvenirDemi: require('./assets/fonts/SouvenirDemi.ttf'),
    AriaScript: require('./assets/fonts/AriaScript.ttf'),
    KFGQPC_HAFS: require('./assets/fonts/KFGQPC_HAFS.ttf'), // Clean Uthmanic font
    HusrevHattiArabic: require('./assets/fonts/HusrevHattiArabic.ttf'), // Husrev Hatti Arabic font

    // New Google Fonts
    CrimsonPro: CrimsonPro_400Regular,
    CrimsonProBold: CrimsonPro_600SemiBold,
    CrimsonProItalic: CrimsonPro_400Regular_Italic,
    Amiri: Amiri_400Regular,
    AmiriBold: Amiri_700Bold,
    PirataOne: PirataOne_400Regular,
    GermaniaOne: GermaniaOne_400Regular,
    Tinos: Tinos_400Regular,
    TinosBold: Tinos_700Bold,
    TinosItalic: Tinos_400Regular_Italic,
    ScheherazadeNew: ScheherazadeNew_400Regular,
    ScheherazadeNewBold: ScheherazadeNew_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  const initAppData = async () => {
    try {
      setDbError(null);

      // 1. Config Check (Non-blocking warning for offline fallback)
      if (!Env.isValid) {
        const missing = Env.getMissingKeys().join(', ');
        console.warn(`[Env] Missing Config Keys: ${missing}. Running in offline/standalone mode.`);
      }

      try {
        await ensureContentDbReady();
      } catch (dbErr) {
        console.warn('[ContentDB] ensureContentDbReady warning:', dbErr);
      }

      try {
        await RisaleAssets.init();
      } catch (assetErr) {
        console.warn('[RisaleAssets] init warning:', assetErr);
      }

      try {
        await initOfflineDb();
      } catch (offlineErr) {
        console.warn('[OfflineDB] init warning:', offlineErr);
      }

      setIsDbReady(true);

      // Non-blocking background tasks
      syncDynamicAliases().catch(e => console.warn('[Lugat] Background sync failed:', e));
      featureFlagService.loadFlags().catch(e => console.warn('[FeatureFlags] Init load failed:', e));
      featureFlagService.startAppStateListener();
      networkSyncWatcher.startWatching();
    } catch (error) {
      console.error('[App] Startup error:', error);
      setIsDbReady(true);
    }
  };

  useEffect(() => {
    // Lock to Portrait by default globally
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(e =>
      console.warn('Orientation Lock Error:', e)
    );
    initAppData();
  }, []);

  // Block rendering until both fonts and DB are ready
  if (!fontsReady || !isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6E3' }}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 16, color: '#64748b', fontFamily: 'serif' }}>
          {!fontsReady ? 'Yazı tipleri yükleniyor...' : 'Kütüphane ve Risaleler Hazırlanıyor...'}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NotificationProvider>
            <OTAUpdateManager />
            <OfflineSyncBadge />
            <StatusBar style="auto" />
            <AppNavigator />
          </NotificationProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
