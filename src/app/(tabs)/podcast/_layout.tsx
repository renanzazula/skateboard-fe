import { Stack } from 'expo-router';

/** The Podcast tab gets its own stack so list -> detail -> admin screens push/pop within the tab. */
export default function PodcastLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Podcast' }} />
      <Stack.Screen name="[slug]" options={{ title: 'Episode' }} />
      <Stack.Screen name="admin/new" options={{ title: 'New post', presentation: 'modal' }} />
      <Stack.Screen name="admin/[id]" options={{ title: 'Edit post', presentation: 'modal' }} />
      <Stack.Screen name="admin/categories" options={{ title: 'Manage categories', presentation: 'modal' }} />
      <Stack.Screen name="admin/import" options={{ title: 'Import posts', presentation: 'modal' }} />
    </Stack>
  );
}
