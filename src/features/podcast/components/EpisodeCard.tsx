import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Mic, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDuration, getYoutubeId, youtubeThumbnail } from '@/features/podcast/services/episodeMeta';
import { Badge } from '@/shared/components/Badge';
import { useTheme } from '@/shared/hooks/use-theme';
import { RADII } from '@/shared/constants/theme';
import type { Post } from '@/shared/types/posts';

// Ported out of rork-standard-app/expo's modules/feed/screens/PodcastScreen.tsx
// (via migrate/podcast/screens/PodcastScreen.tsx) — the gradient-scrim
// episode card, split into its own component. Replaces PostCard's usage in
// the podcast list.

// Overlay colors sit on top of episode imagery, so they stay dark/white regardless of theme.
const OVERLAY = {
  scrim: ['transparent', 'rgba(0,0,0,0.85)'] as const,
  title: '#FFFFFF',
  meta: 'rgba(255,255,255,0.78)',
  playBg: 'rgba(255,255,255,0.18)',
  playBorder: 'rgba(255,255,255,0.35)',
};

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
    <Pressable style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={onPress}>
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
        <View style={[StyleSheet.absoluteFill, styles.coverPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
          <Mic size={40} color={colors.textMuted} />
        </View>
      )}

      <LinearGradient colors={OVERLAY.scrim} style={styles.scrim} />

      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Badge label={`EP #${episodeNumber}`} style={styles.epBadge} />
          <Text style={styles.cardTitle} numberOfLines={2}>
            {post.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatDate(post.publishAt ?? post.createdAt)}</Text>
            {duration ? (
              <>
                <Clock size={13} color={OVERLAY.meta} />
                <Text style={styles.metaText}>{duration}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.playButton}>
          <Play size={20} color={OVERLAY.title} fill={OVERLAY.title} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 240,
    borderRadius: RADII.card,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  epBadge: {
    marginBottom: 8,
  },
  cardTitle: {
    color: OVERLAY.title,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: OVERLAY.meta,
    fontSize: 13,
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: OVERLAY.playBg,
    borderWidth: 1,
    borderColor: OVERLAY.playBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
