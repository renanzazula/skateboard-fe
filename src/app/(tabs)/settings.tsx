import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useThemeMode } from '@/shared/providers/ThemeProvider';

export default function SettingsScreen() {
  const { logout, authorities } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Settings</ThemedText>

        <ThemedView type="surface" style={styles.section}>
          <ThemedText type="smallBold">Appearance</ThemedText>
          <Pressable onPress={toggleMode}>
            <ThemedText type="link" themeColor="accent">
              {mode === 'dark' ? 'Dark' : 'Light'} — tap to switch
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="surface" style={styles.section}>
          <ThemedText type="smallBold">Permissions</ThemedText>
          {authorities.map((authority) => (
            <ThemedText key={authority} type="small" themeColor="textDim">
              {authority}
            </ThemedText>
          ))}
        </ThemedView>

        <Pressable onPress={() => logout()}>
          <ThemedView type="surface" style={styles.button}>
            <ThemedText type="smallBold">Log out</ThemedText>
          </ThemedView>
        </Pressable>
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
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  section: {
    borderRadius: RADII.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
});
