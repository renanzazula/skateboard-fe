import { Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DarkTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/core/auth';
import { AppConfigProvider } from '@/core/config';
import { env } from '@/core/config/env';
import { I18nProvider, useLanguageReady } from '@/core/i18n';
import { CampaignGate } from '@/features/campaign';
import { useCampaignResolver } from '@/features/campaign/hooks/useCampaignResolver';
import { PushNotificationsGate, useOpenPendingNotificationTarget, wasLaunchedFromNotification } from '@/features/notifications';
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

  // Read once, on the first render of the process: a tap that launched the
  // app is the user asking for that episode, so the startup campaign is
  // skipped for this launch rather than played in between. Nothing is marked
  // shown, so the campaign still appears on the next ordinary launch. Taps on
  // an app that is already running never get here — the resolver only runs
  // once per process.
  const [launchedFromNotification] = useState(wasLaunchedFromNotification);

  // Owned here (not inside CampaignGate) so its phase can also gate the
  // native splash below — otherwise the stack becomes visible before the
  // campaign overlay is ready, showing Login/Home first with the campaign
  // popping in on top a beat later. See useCampaignResolver.
  const campaignsEnabled = env.campaignsEnabled && status !== 'loading' && !launchedFromNotification;
  const { phase: campaignPhase, campaign, markShown } = useCampaignResolver(campaignsEnabled);

  const ready = status !== 'loading' && fontsLoaded && languageReady && campaignPhase === 'ready';

  // Hold the native splash (see SplashScreen.preventAutoHideAsync above) until
  // auth, fonts, language and the startup campaign are resolved, then hand
  // straight off to the first real screen — no intermediate overlay, so the
  // branded splash goes directly to (auth)/login, (tabs), or the campaign
  // overlay on top of either. Silent sign-in and campaign/image preload all
  // finish under the splash rather than flashing an intermediate screen.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  // A tapped push is opened here, not where the tap is captured: only once the
  // session is restored (video/[slug] is behind the signedIn guard) and the
  // splash has handed off to the stack. Pushed on top of (tabs), so back
  // returns to Home. A tap while signed out waits through login.
  useOpenPendingNotificationTarget(ready && status === 'signedIn');

  return (
    <NavigationThemeProvider value={DarkTheme}>
      {/* App is dark-only, so the navigation theme is always DarkTheme.
          The guards below also decide (tabs) vs (auth). */}
      {/* Startup campaigns play here — above the stack — so the stack mounts
          but stays hidden/non-interactive until the sequence ends (or
          immediately, when nothing is eligible or the feature is off).
          See features/campaign/CampaignGate. */}
      <CampaignGate phase={campaignPhase} campaign={campaign} markShown={markShown}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={status === 'signedIn'}>
            <Stack.Screen name="(tabs)" />
            {/* Sits above (tabs) so Home can link into it without pushing onto
                the Podcast tab's own stack — see app/video/[slug].tsx. */}
            <Stack.Screen name="video/[slug]" />
            {/* Opened from Home's bell; above (tabs) for the same reason. */}
            <Stack.Screen name="notifications" />
          </Stack.Protected>
          <Stack.Protected guard={status !== 'signedIn'}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* Unguarded — outside both Stack.Protected blocks above, so it
              renders whether signed in or signed out. This is the one route
              the App Store / Play Store listing links to, and app reviewers
              must be able to open it with no login at all; its content
              (GET /api/privacy-policy) is likewise fully anonymous.
              Declared LAST: the native stack navigator defaults
              initialRouteName to the first declared Screen when none is set
              explicitly, so this must not sit before (tabs)/(auth) — doing so
              previously hijacked "/" into opening this screen on every
              fresh mount (e.g. right after login), instead of (tabs). */}
          <Stack.Screen name="privacy-policy" />
        </Stack>
      </CampaignGate>
    </NavigationThemeProvider>
  );
}
