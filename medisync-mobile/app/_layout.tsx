import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase/client';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { initSyncQueue, setupNetworkListener } from '../lib/offline/syncQueue';
import { setupNotificationHandlers } from '../lib/notifications/push';
import {
  setupCallNotificationHandler,
  setupForegroundCallHandler,
} from '../lib/notifications/callHandler';
import type { Session } from '@supabase/supabase-js';
import type { Subscription } from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initSyncQueue().then(() => setupNetworkListener()).catch(console.error);
    setupNotificationHandlers();

    // Set up call notification handlers and clean up on unmount
    const tapSub: Subscription = setupCallNotificationHandler();
    const fgSub: Subscription = setupForegroundCallHandler();

    return () => {
      tapSub.remove();
      fgSub.remove();
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined || !fontsLoaded) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      router.replace('/(patient)/medications');
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [session, fontsLoaded, segments, router]);

  if (session === undefined || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0D6B5E" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OfflineBanner />
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D6B5E',
  },
});
