import * as AuthSession from 'expo-auth-session';
import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { useAppConfig } from '@/core/config';
import { BrandedLogo } from '@/features/branding/components/BrandedLogo';
import { warnImageUnreachable } from '@/features/branding/services/warnImageUnreachable';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';

// Mirrors CSS clamp(min, vh-fraction, max) so the title/logo areas scale
// with viewport height the same way across native and web without needing
// separate stylesheets.
const clampByHeight = (min: number, vhFraction: number, max: number, windowHeight: number) =>
  Math.min(max, Math.max(min, windowHeight * vhFraction));

// Below this viewport height, use fixed compact values instead of the
// clamp() curve — same idea as the reference layout's `max-height: 750px`
// breakpoint.
const COMPACT_HEIGHT_BREAKPOINT = 750;
const COMPACT_LOGO_AREA_PADDING_TOP = 40;
const COMPACT_LOGO_AREA_HEIGHT = 240;

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const { loginBackgroundUrl, loginTitle, loginMessage } = useAppConfig();
  const { height: windowHeight } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !signingIn;
  const isCompactHeight = windowHeight <= COMPACT_HEIGHT_BREAKPOINT;
  // Reserved logo area height stays within this range regardless of the
  // logo's real dimensions — BrandedLogo scales to fit inside it (contain),
  // so a tall or wide tenant logo never pushes the title/form below.
  const logoAreaPaddingTop = isCompactHeight ? COMPACT_LOGO_AREA_PADDING_TOP : clampByHeight(60, 0.08, 90, windowHeight);
  const logoAreaHeight = isCompactHeight ? COMPACT_LOGO_AREA_HEIGHT : clampByHeight(280, 0.34, 340, windowHeight);

  const handleLogin = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await loginWithPassword(username.trim(), password);
    } catch (err) {
      if (err instanceof AuthSession.TokenError && err.code === 'invalid_grant') {
        setError('Invalid username or password.');
      } else {
        setError('Could not reach Keycloak. Check your connection and try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Gradient stays as the base layer regardless of whether a tenant
          background is configured, so there's no layout flash while
          useAppConfig() is still loading — the image is purely additive. */}
      {loginBackgroundUrl ? (
        <>
          <Image
            source={{ uri: loginBackgroundUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={({ error }) => warnImageUnreachable('login background', loginBackgroundUrl, error)}
          />
          {/* Normalizes contrast against admin-uploaded backgrounds of
              unpredictable brightness — see .docs/README-branding-login-background.md #6. */}
          <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        </>
      ) : null}
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* 1. Logo — reserved area of fixed/responsive height; the
                  logo scales inside it (contain) instead of the area
                  growing to the logo's natural size, so different tenant
                  logos never move the title/form below. */}
              <View style={[styles.logoContainer, { height: logoAreaHeight, paddingTop: logoAreaPaddingTop }]}>
                <BrandedLogo style={styles.logo} />
              </View>

              {/* 2. Title, directly below the logo. */}
              {loginTitle ? (
                <ThemedText type="title" style={styles.title}>
                  {loginTitle}
                </ThemedText>
              ) : null}

              {/* 3. Message, directly below the title. */}
              <ThemedText type="default" themeColor="textSecondary" style={styles.message}>
                {loginMessage || 'Sign in to continue'}
              </ThemedText>

              {/* 4-6. Username, password, login button. */}
              <View style={styles.form}>
                <TextField
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username or email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <TextField value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

                <PrimaryButton
                  title={signingIn ? 'Signing in…' : 'Log in'}
                  onPress={handleLogin}
                  disabled={!canSubmit}
                  loading={signingIn}
                />

                {error && (
                  <ThemedText type="small" themeColor="destructive" style={styles.error}>
                    {error}
                  </ThemedText>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '85%',
    height: '100%',
  },
  title: {
    width: '100%',
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  message: {
    width: '100%',
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  form: {
    width: '100%',
    gap: Spacing.three,
  },
  error: {
    textAlign: 'center',
  },
});
