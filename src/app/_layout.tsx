import { Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '@/core/auth';
import { AnimatedSplashOverlay } from '@/shared/components/animated-icon';
import { AppThemeProvider, useThemeMode } from '@/shared/providers/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_700Bold });

  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootNavigator fontsLoaded={fontsLoaded} />
      </AuthProvider>
    </AppThemeProvider>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  const { resolvedMode, isLoaded: themeLoaded } = useThemeMode();
  const ready = status !== 'loading' && themeLoaded && fontsLoaded;

  return (
    <NavigationThemeProvider value={resolvedMode === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Only mounted once auth, theme, and fonts are all ready, so the
          native splash (see SplashScreen.preventAutoHideAsync above) stays
          up through silent sign-in instead of flashing the wrong
          theme/font before hiding — this also decides (tabs) vs (auth). */}
      {ready && <AnimatedSplashOverlay />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
