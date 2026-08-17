import { Stack } from 'expo-router';

/** The Settings tab gets its own stack so index -> account sub-screens push/pop within the tab, mirroring podcast/_layout.tsx. */
export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile', presentation: 'modal' }} />
      <Stack.Screen name="username" options={{ title: 'Username', presentation: 'modal' }} />
      <Stack.Screen name="profile-picture" options={{ title: 'Profile picture', presentation: 'modal' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change password', presentation: 'modal' }} />
      <Stack.Screen name="branding" options={{ title: 'Branding', presentation: 'modal' }} />
      <Stack.Screen name="home-categories" options={{ title: 'Home Video Categories', presentation: 'modal' }} />
      <Stack.Screen name="podcast-admin" options={{ title: 'Podcast administration' }} />
      <Stack.Screen name="manage-categories" options={{ title: 'Manage categories' }} />
    </Stack>
  );
}
