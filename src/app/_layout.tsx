import { Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/core/auth';
import { AppConfigProvider } from '@/core/config';
import { I18nProvider, useLanguageReady } from '@/core/i18n';
import { PushNotificationsGate } from '@/features/notifications';
import { AnimatedSplashOverlay } from '@/shared/components/animated-icon';
import { RouteErrorFallback } from '@/shared/components/RouteErrorFallback';

SplashScreen.preventAutoHideAsync();

// Expo Router convention: exporting a component named `ErrorBoundary` from a
// route file catches errors thrown during render anywhere below it, instead
// of the app going blank with nothing logged anywhere (this is the root
// layout, so it covers every screen). See RouteErrorFallback for why the
// real error is shown unconditionally.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <RouteErrorFallback error={error} retry={retry} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_700Bold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppConfigProvider>
        <I18nProvider>
          <AuthProvider>
            {/* Inside AuthProvider because it registers this device only once
                the user is signed in — the call is authenticated and the
                device is recorded against the JWT's subject. Renders nothing. */}
            <PushNotificationsGate />
            <RootNavigator fontsLoaded={fontsLoaded} />
          </AuthProvider>
        </I18nProvider>
      </AppConfigProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  const languageReady = useLanguageReady();
  const ready = status !== 'loading' && fontsLoaded && languageReady;

  return (
    <NavigationThemeProvider value={DarkTheme}>
      {/* Mounted immediately (not gated on `ready`) so it swaps in for the
          native splash (see SplashScreen.preventAutoHideAsync above) the
          instant its own layout completes — covering the Stack below, which
          starts mounting/initializing right away but must stay hidden until
          auth/fonts/language are ready. It only fades out once `ready` flips
          true, so the login/home screen underneath is never exposed early. */}
      <AnimatedSplashOverlay ready={ready} />
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
