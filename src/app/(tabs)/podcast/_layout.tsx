import { Stack } from 'expo-router';

/**
 * The Podcast tab gets its own stack so list -> detail -> admin screens
 * push/pop within the tab. The list renders its own AppHeader (same bar as
 * Settings and Home), so the native header is off there — leaving both on
 * stacked two titles at the top of the screen. The admin screens keep theirs:
 * they're modals, and the native header carries their dismiss affordance.
 */
export default function PodcastLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[slug]" options={{ title: 'Episode' }} />
      <Stack.Screen name="admin/new" options={{ title: 'New post', presentation: 'modal' }} />
      <Stack.Screen name="admin/[id]" options={{ title: 'Edit post', presentation: 'modal' }} />
      <Stack.Screen name="admin/import" options={{ title: 'Import posts', presentation: 'modal' }} />
    </Stack>
  );
}
