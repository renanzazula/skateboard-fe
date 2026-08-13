import * as AuthSession from 'expo-auth-session';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const theme = useTheme();
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
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Skateboard
        </ThemedText>
        <ThemedText type="default" themeColor="textDim" style={styles.subtitle}>
          Sign in to continue
        </ThemedText>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username or email"
          placeholderTextColor={theme.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={theme.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />

        <Pressable disabled={!canSubmit} onPress={handleLogin}>
          <ThemedView type={canSubmit ? 'accent' : 'surface'} style={styles.button}>
            <ThemedText type="smallBold" themeColor={canSubmit ? 'onAccent' : 'textFaint'}>
              {signingIn ? 'Signing in…' : 'Log in'}
            </ThemedText>
          </ThemedView>
        </Pressable>

        {error && (
          <ThemedText type="small" themeColor="danger" style={styles.error}>
            {error}
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
  error: {
    textAlign: 'center',
  },
});
