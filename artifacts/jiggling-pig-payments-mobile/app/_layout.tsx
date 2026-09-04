import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { setBaseUrl } from '@workspace/api-client-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  useFonts,
} from '@expo-google-fonts/barlow';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { NotificationRouter } from '../components/NotificationRouter';
import { Colors } from '../constants/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f47920',
      }).catch(() => {});
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotificationRouter />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.light.background } }}>
                <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="payment/[id]" options={{ presentation: 'card', headerShown: true, title: 'Payment Details', headerBackTitle: 'Back' }} />
                <Stack.Screen name="refund/[id]" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="order/[id]" options={{ presentation: 'card', headerShown: true, title: 'Order Details', headerBackTitle: 'Back' }} />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
