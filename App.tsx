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

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    // Local legacy fonts
    LivaNur: require('./assets/fonts/LivaNur.ttf'),
    SouvenirDemi: require('./assets/fonts/SouvenirDemi.ttf'),
    AriaScript: require('./assets/fonts/AriaScript.ttf'),
    KFGQPC_HAFS: require('./assets/fonts/KFGQPC_HAFS.ttf'), // Clean Uthmanic font

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
  });

  useEffect(() => {
    const initDb = async () => {
      try {
        await ensureContentDbReady();
        // Risale Assets Initialization
        await RisaleAssets.init();
        // Initialize Offline Database (Supabase Mirror)
        await initOfflineDb();
        setIsDbReady(true);
      } catch (error) {
        setDbError((error as Error).message);
      }
    };
    initDb();
  }, []);

  // Block rendering until both fonts and DB are ready
  if (!fontsLoaded || !isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6E3' }}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 16, color: '#64748b', fontFamily: 'serif' }}>
          {!fontsLoaded ? 'Yazı tipleri yükleniyor...' : 'Kütüphane ve Risaleler Hazırlanıyor...'}
        </Text>
        {dbError && <Text style={{ marginTop: 16, color: '#ef4444' }}>Hata: {dbError}</Text>}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NotificationProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </NotificationProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
