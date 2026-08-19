import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Mic, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getDuration, getYoutubeId, youtubeThumbnail } from '@/features/podcast/services/episodeMeta';
import { Badge } from '@/shared/components/Badge';
import { useTheme } from '@/shared/hooks/use-theme';
import { RADII } from '@/shared/constants/theme';
import type { Post } from '@/shared/types/posts';

// Full-bleed artwork with the episode details laid over it, behind a bottom
// scrim that keeps them readable on any thumbnail. The alternative — a text
// block stacked under the image — costs a lot of vertical space per row and
// makes the artwork feel like a header rather than the card itself.

// These sit on imagery, so they stay fixed regardless of theme — same
// convention as Badge and PodcastEpisodeDetail's OVERLAY.
const OVERLAY = {
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.82)',
  playFill: 'rgba(255,255,255,0.28)',
  playBorder: 'rgba(255,255,255,0.85)',
};

const PLAY_SIZE = 56;

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
      onPress={onPress}
      accessibilityRole="button"
      // One coherent label instead of four separate text nodes.
      accessibilityLabel={`${post.title}, episode ${episodeNumber}`}>
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
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: colors.surface }]}>
          <Mic size={40} color={colors.textMuted} />
        </View>
      )}

      {/* Bottom-weighted so the top of the artwork stays untouched. Three
          stops rather than two: a straight transparent->black ramp washes out
          the middle of the image well above where the text actually sits. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
        locations={[0.35, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.overlay}>
        <Badge label={`EP #${episodeNumber}`} style={styles.badge} />
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDate(post.publishAt ?? post.createdAt)}</Text>
          {duration ? (
            <>
              <Clock size={13} color={OVERLAY.muted} />
              <Text style={styles.metaText}>{duration}</Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.playButton}>
        <Play size={24} color={OVERLAY.white} fill={OVERLAY.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // 16:9 keeps YouTube thumbnails uncropped; the overlay rides on top
    // rather than adding height below.
    aspectRatio: 16 / 9,
    width: '100%',
    borderRadius: RADII.card,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    padding: 14,
    // Keeps the title clear of the play button on narrow screens.
    paddingRight: PLAY_SIZE + 22,
  },
  badge: {
    marginBottom: 8,
  },
  title: {
    color: OVERLAY.white,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: OVERLAY.muted,
    fontSize: 13,
  },
  playButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: PLAY_SIZE / 2,
    backgroundColor: OVERLAY.playFill,
    borderWidth: 2,
    borderColor: OVERLAY.playBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
