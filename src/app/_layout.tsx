import { Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/core/auth';
import { AppConfigProvider } from '@/core/config';
import { AnimatedSplashOverlay } from '@/shared/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_700Bold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppConfigProvider>
        <AuthProvider>
          <RootNavigator fontsLoaded={fontsLoaded} />
        </AuthProvider>
      </AppConfigProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  const ready = status !== 'loading' && fontsLoaded;

  return (
    <NavigationThemeProvider value={DarkTheme}>
      {/* Only mounted once auth and fonts are ready, so the native splash
          (see SplashScreen.preventAutoHideAsync above) stays up through
          silent sign-in instead of flashing the wrong font before hiding —
          this also decides (tabs) vs (auth). App is dark-only, so the
          navigation theme is always DarkTheme. */}
      {ready && <AnimatedSplashOverlay />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          {/* Sits above (tabs) so Home can link into it without pushing onto
              the Podcast tab's own stack — see app/video/[slug].tsx. */}
          <Stack.Screen name="video/[slug]" />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
