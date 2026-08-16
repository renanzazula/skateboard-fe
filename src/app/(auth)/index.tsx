import { LinearGradient } from 'expo-linear-gradient';
import * as AuthSession from 'expo-auth-session';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { useAppConfig } from '@/core/config';
import { BrandedLogo } from '@/features/branding/components/BrandedLogo';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, Spacing } from '@/shared/constants/theme';

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const { loginBackgroundUrl, loginBackgroundVersion } = useAppConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !signingIn;

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
            source={{ uri: `${loginBackgroundUrl}?v=${loginBackgroundVersion}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* Normalizes contrast against admin-uploaded backgrounds of
              unpredictable brightness — see .docs/README-branding-login-background.md #6. */}
          <View style={[StyleSheet.absoluteFill, styles.overlay]} />
        </>
      ) : null}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brand}>
          <View style={styles.glow}>
            <LinearGradient colors={['rgba(255,212,0,0.35)', 'rgba(255,212,0,0)']} style={styles.glowFill} />
          </View>
          <BrandedLogo style={styles.logo} />
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Sign in to continue
          </ThemedText>
        </View>

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
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
    paddingHorizontal: Spacing.four,
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  glow: {
    position: 'absolute',
    top: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },
  glowFill: {
    flex: 1,
  },
  logo: {
    width: 56,
    height: 56,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  form: {
    width: '100%',
    gap: Spacing.three,
  },
  error: {
    textAlign: 'center',
  },
});
