import { Stack } from 'expo-router';

/**
 * The Settings tab gets its own stack so home -> sub-screens push/pop within
 * the tab, mirroring podcast/_layout.tsx. Every screen hides the native
 * header and renders its own SettingsHeader instead (centered title +
 * @handle subtitle) — see .docs/SETTINGS_REDESIGN_2.md §5.
 */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="data-storage" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="administration" />
      <Stack.Screen name="branding" />
      <Stack.Screen name="home-categories" />
      <Stack.Screen name="podcast-admin" />
      <Stack.Screen name="manage-categories" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
