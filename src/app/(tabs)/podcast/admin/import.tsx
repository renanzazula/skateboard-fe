import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { usePodcastAdmin, type ImportResult } from '@/features/podcast/hooks/usePodcastAdmin';
import { isBffError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export default function ImportPodcastPostsScreen() {
  const { hasAuthority } = useAuth();
  const { importPosts, submitting } = usePodcastAdmin();
  const theme = useTheme();
  const [json, setJson] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!hasAuthority('FUNC_PODCAST_IMPORT_JSON')) {
    return <Redirect href="/podcast" />;
  }

  const handleImport = async () => {
    setResult(null);
    let posts: unknown;
    try {
      const parsed = JSON.parse(json);
      posts = Array.isArray(parsed) ? parsed : parsed.posts;
      if (!Array.isArray(posts)) throw new Error('not an array');
    } catch {
      Alert.alert('Invalid JSON', 'Paste either an array of posts or {"posts": [...]}.');
      return;
    }
    try {
      const importResult = await importPosts({ posts } as Parameters<typeof importPosts>[0]);
      setResult(importResult);
    } catch (importError) {
      Alert.alert('Import failed', isBffError(importError) ? importError.message : 'Try again.');
    }
  };

  const failed = result?.failed ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="small">{'Paste post JSON — either an array or {"posts": [...]}'}</ThemedText>
        <TextInput
          value={json}
          onChangeText={setJson}
          multiline
          placeholder='[{"title": "...", "coverUrl": "...", "status": "published"}]'
          placeholderTextColor={theme.textFaint}
          style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
        />
        <Pressable disabled={submitting || json.trim().length === 0} onPress={handleImport}>
          <ThemedView type="accent" style={styles.button}>
            <ThemedText type="smallBold" themeColor="onAccent">
              {submitting ? 'Importing…' : 'Import'}
            </ThemedText>
          </ThemedView>
        </Pressable>

        {result && (
          <ThemedView type="surface" style={styles.resultBox}>
            <ThemedText type="small">
              Imported <ThemedText type="smallBold" themeColor="success">{result.imported ?? 0}</ThemedText>
              {failed > 0 && (
                <>
                  , failed <ThemedText type="smallBold" themeColor="danger">{failed}</ThemedText>
                </>
              )}
            </ThemedText>
            {(result.errors ?? []).map((message, index) => (
              <ThemedText key={index} type="small" themeColor="danger">
                {message}
              </ThemedText>
            ))}
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.three,
    minHeight: 160,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
  resultBox: {
    borderRadius: RADII.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
