import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import type { PostSummary } from '@/features/podcast/hooks/usePodcastFeed';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link href={`/podcast/${post.slug}`} asChild>
      <Pressable>
        <ThemedView type="backgroundElement" style={styles.card}>
          {post.coverUrl && <Image source={{ uri: post.coverUrl }} style={styles.cover} />}
          <ThemedText type="subtitle">{post.title}</ThemedText>
          {post.status !== 'published' && (
            <ThemedText type="small" themeColor="textSecondary">
              {post.status}
            </ThemedText>
          )}
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
  },
});
