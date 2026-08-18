import { Stack } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Mic, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockRenderer } from '@/features/podcast/components/blocks/BlockRenderer';
import { EpisodeVideoPlayer } from '@/features/podcast/components/EpisodeVideoPlayer';
import { InstagramIcon } from '@/features/podcast/components/icons/InstagramIcon';
import {
  extractYoutubeIdFromUrl,
  getDescription,
  getDuration,
  getInstagramUrl,
  getSpotifyEmbedUrl,
  getYoutubeId,
} from '@/features/podcast/services/episodeMeta';
import { Badge } from '@/shared/components/Badge';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { MAX_CONTENT_WIDTH } from '@/shared/constants/theme';
import type { Post, VideoBlock } from '@/shared/types/posts';

// Ported from rork-standard-app/expo's modules/feed/screens (via
// migrate/podcast/components/PodcastEpisodeDetail.tsx).

// Loaded lazily so the web bundle never executes native-only modules.
let RNWebView: any = null;
if (Platform.OS !== 'web') {
  RNWebView = require('react-native-webview').WebView;
}

// Colors overlaid on imagery stay dark/white regardless of theme.
const OVERLAY = {
  scrimButton: 'rgba(0,0,0,0.45)',
  white: '#FFFFFF',
};

const HERO_HEIGHT = 280;
const DESCRIPTION_COLLAPSE_LENGTH = 180;

type Props = {
  post: Post;
  episodeNumber: number | null;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function FloatingButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable style={styles.floatingButton} onPress={onPress} hitSlop={8} accessibilityLabel={label} accessibilityRole="button">
      {children}
    </Pressable>
  );
}

export function PodcastEpisodeDetail({ post, episodeNumber, canEdit, canDelete, onBack, onEdit, onDelete }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const youtubeId = getYoutubeId(post);
  const spotifyEmbedUrl = getSpotifyEmbedUrl(post);
  const instagramUrl = getInstagramUrl(post);
  const duration = getDuration(post);
  const description = getDescription(post);

  const [expanded, setExpanded] = useState(false);

  // Episodes without a YouTube id can still carry a direct video file as a
  // `video` block — surface the first one in the hero player.
  const heroFileBlock = youtubeId
    ? null
    : (post.blocks.find((b): b is VideoBlock => b.type === 'video' && !!b.data.url) ?? null);
  const heroVideoUrl = heroFileBlock?.data.url ?? null;
  const hasVideo = !!(youtubeId || heroVideoUrl);

  const heroUri = post.coverUrl || null;

  const publishDate = new Date(post.publishAt ?? post.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const collapsible = description.length > DESCRIPTION_COLLAPSE_LENGTH;
  const shownDescription =
    collapsible && !expanded ? `${description.slice(0, DESCRIPTION_COLLAPSE_LENGTH).trimEnd()}…` : description;

  // Blocks already surfaced by the redesigned layout (including whichever
  // video the hero player took over).
  const extraBlocks = post.blocks.filter((b) => {
    if (b.type === 'text' || b.type === 'spotify') return false;
    if (b.type === 'embed' && b.data.platform === 'youtube') return false;
    if (b.type === 'video') {
      if (b === heroFileBlock) return false;
      if (youtubeId && b.data.url && extractYoutubeIdFromUrl(b.data.url) === youtubeId) return false;
    }
    return true;
  });

  const renderHero = () => {
    if (hasVideo) {
      return (
        <EpisodeVideoPlayer
          youtubeId={youtubeId}
          videoUrl={heroVideoUrl}
          poster={heroUri}
          height={HERO_HEIGHT}
        />
      );
    }

    return heroUri ? (
      <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
        <Mic size={48} color={colors.textMuted} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>{renderHero()}</View>

        <View style={styles.body}>
          {episodeNumber ? <Badge label={`EP #${episodeNumber}`} style={styles.epBadge} /> : null}

          <Text style={[styles.title, { color: colors.textPrimary }]}>{post.title}</Text>

          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{publishDate}</Text>
            {duration ? (
              <>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{duration}</Text>
              </>
            ) : null}
            {instagramUrl ? (
              <Pressable onPress={() => Linking.openURL(instagramUrl)} hitSlop={8} accessibilityLabel="Open Instagram" accessibilityRole="link">
                <InstagramIcon size={16} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>

          {spotifyEmbedUrl ? (
            <View style={styles.section}>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                {t('podcast.listenOnSpotify').toUpperCase()}
              </Text>
              <View style={styles.spotifyEmbed}>
                {Platform.OS === 'web' ? (
                  /* @ts-ignore web-only element */
                  <iframe
                    src={spotifyEmbedUrl}
                    style={{ width: '100%', height: 152, border: 'none', borderRadius: 12 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
                ) : (
                  <RNWebView
                    source={{ uri: spotifyEmbedUrl }}
                    style={styles.spotifyWebView}
                    scrollEnabled={false}
                    allowsInlineMediaPlayback
                  />
                )}
              </View>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {description ? (
            <View>
              <Text style={[styles.description, { color: colors.textPrimary }]}>{shownDescription}</Text>
              {collapsible ? (
                <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                  <Text style={[styles.toggle, { color: colors.primary }]}>
                    {expanded ? t('podcast.showLess') : t('podcast.showMore')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {extraBlocks.length > 0 ? (
            <View style={styles.extraBlocks}>
              {extraBlocks.map((block, i) => (
                <BlockRenderer key={i} block={block} />
              ))}
            </View>
          ) : null}

          <Text style={[styles.footerCaption, { color: colors.textMuted }]}>
            {t('podcast.recordedOn').replace('{date}', publishDate)}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.floatingBar, { top: insets.top + 8 }]}>
        <FloatingButton onPress={onBack} label="Back">
          <ArrowLeft size={20} color={OVERLAY.white} />
        </FloatingButton>
        <View style={styles.floatingActions}>
          {canEdit ? (
            <FloatingButton onPress={onEdit} label="Edit episode">
              <Pencil size={18} color={OVERLAY.white} />
            </FloatingButton>
          ) : null}
          {canDelete ? (
            <FloatingButton onPress={onDelete} label="Delete episode">
              <Trash2 size={18} color={colors.destructive} />
            </FloatingButton>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  hero: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  floatingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: OVERLAY.scrimButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  epBadge: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },
  metaText: {
    fontSize: 13,
    marginRight: 6,
  },
  section: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  spotifyEmbed: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  spotifyWebView: {
    height: 152,
    backgroundColor: 'transparent',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 18,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 24,
  },
  toggle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  extraBlocks: {
    marginTop: 18,
  },
  footerCaption: {
    fontSize: 12,
    marginTop: 28,
  },
});
