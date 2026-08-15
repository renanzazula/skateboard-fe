import { Clock, Mic, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDuration, getYoutubeId, youtubeThumbnail } from '@/features/podcast/services/episodeMeta';
import { Badge } from '@/shared/components/Badge';
import { useTheme } from '@/shared/hooks/use-theme';
import { RADII } from '@/shared/constants/theme';
import type { Post } from '@/shared/types/posts';

// Stacked thumbnail-then-content card per
// .docs/README_YOUTUBE_PLAYLIST_CATEGORIES_MIGRATION.md §24-25 — replaces
// the previous text-over-image gradient-scrim layout. Same data sources
// (episodeMeta.ts), new layout only.

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

type Props = { post: Post; episodeNumber: number; onPress: () => void };

export function EpisodeCard({ post, episodeNumber, onPress }: Props) {
  const colors = useTheme();
  const youtubeId = getYoutubeId(post);
  const [thumbFailed, setThumbFailed] = useState(false);
  const duration = getDuration(post);

  const imageUri =
    post.coverUrl || (youtubeId ? youtubeThumbnail(youtubeId, thumbFailed ? 'hqdefault' : 'maxresdefault') : null);

  return (
    <Pressable
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
      onPress={onPress}>
      <View style={styles.thumbnail}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => {
              if (!post.coverUrl && !thumbFailed) setThumbFailed(true);
            }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.thumbnailPlaceholder, { backgroundColor: colors.surface }]}>
            <Mic size={40} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.playButton}>
          <Play size={20} color={colors.textPrimary} fill={colors.textPrimary} />
        </View>
      </View>

      <View style={styles.content}>
        <Badge label={`EP #${episodeNumber}`} style={styles.epBadge} />
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {formatDate(post.publishAt ?? post.createdAt)}
          </Text>
          {duration ? (
            <>
              <Clock size={13} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{duration}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADII.card,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  thumbnail: {
    aspectRatio: 16 / 9,
    width: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
  },
  epBadge: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
});
