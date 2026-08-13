import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, AtSign, Calendar, Clock, Mic, Pencil, Play, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockRenderer } from '@/features/podcast/components/blocks/BlockRenderer';
import {
  getDescription,
  getDuration,
  getInstagramUrl,
  getSpotifyEmbedUrl,
  getYoutubeId,
  youtubeThumbnail,
} from '@/features/podcast/services/episodeMeta';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { MAX_CONTENT_WIDTH, RADII } from '@/shared/constants/theme';
import type { Post } from '@/shared/types/posts';

// Ported from rork-standard-app/expo's modules/feed/screens (via
// migrate/podcast/components/PodcastEpisodeDetail.tsx).

// Loaded lazily so the web bundle never executes native-only modules.
let YoutubePlayer: any = null;
let RNWebView: any = null;
if (Platform.OS !== 'web') {
  YoutubePlayer = require('react-native-youtube-iframe').default;
  RNWebView = require('react-native-webview').WebView;
}

// Colors overlaid on imagery stay dark/white in both themes.
const OVERLAY = {
  scrimButton: 'rgba(0,0,0,0.45)',
  gold: '#F2A900',
  onGold: '#1A1A1C',
  white: '#FFFFFF',
  youtube: '#FF0000',
};

const HERO_HEIGHT = 280;
const DESCRIPTION_COLLAPSE_LENGTH = 180;

type Props = {
  post: Post;
  episodeNumber: number | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function FloatingButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable style={styles.floatingButton} onPress={onPress} hitSlop={8}>
      {children}
    </Pressable>
  );
}

export function PodcastEpisodeDetail({ post, episodeNumber, canEdit, canDelete, onEdit, onDelete }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const youtubeId = getYoutubeId(post);
  const spotifyEmbedUrl = getSpotifyEmbedUrl(post);
  const instagramUrl = getInstagramUrl(post);
  const duration = getDuration(post);
  const description = getDescription(post);

  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const heroUri =
    (youtubeId && !post.coverUrl
      ? youtubeThumbnail(youtubeId, thumbFailed ? 'hqdefault' : 'maxresdefault')
      : post.coverUrl) || (youtubeId ? youtubeThumbnail(youtubeId, 'hqdefault') : null);

  const publishDate = new Date(post.publishAt ?? post.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const collapsible = description.length > DESCRIPTION_COLLAPSE_LENGTH;
  const shownDescription =
    collapsible && !expanded ? `${description.slice(0, DESCRIPTION_COLLAPSE_LENGTH).trimEnd()}…` : description;

  // Blocks already surfaced by the redesigned layout
  const extraBlocks = post.blocks.filter(
    (b) => b.type !== 'text' && b.type !== 'spotify' && !(b.type === 'embed' && b.data.platform === 'youtube')
  );

  const renderHero = () => {
    if (playing && youtubeId) {
      if (Platform.OS === 'web') {
        return (
          <View style={styles.heroPlayer}>
            {/* @ts-ignore web-only element */}
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </View>
        );
      }
      return (
        <View style={styles.heroPlayer}>
          <YoutubePlayer height={HERO_HEIGHT} play videoId={youtubeId} />
        </View>
      );
    }

    return (
      <>
        {heroUri ? (
          <Image
            source={{ uri: heroUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => {
              if (!thumbFailed) setThumbFailed(true);
            }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder, { backgroundColor: colors.surfaceHigh }]}>
            <Mic size={48} color={colors.textFaint} />
          </View>
        )}
        {youtubeId ? (
          <Pressable style={styles.playOverlay} onPress={() => setPlaying(true)}>
            <View style={styles.playCircle}>
              <Play size={26} color={OVERLAY.white} fill={OVERLAY.white} />
            </View>
          </Pressable>
        ) : null}
        {youtubeId ? (
          <View style={styles.watchTag}>
            <Text style={styles.watchTagText}>{t('podcast.watch')}</Text>
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>{renderHero()}</View>

        <View style={styles.body}>
          {episodeNumber ? (
            <View style={styles.epBadge}>
              <Text style={styles.epBadgeText}>EP #{episodeNumber}</Text>
            </View>
          ) : null}

          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>

          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textDim} />
            <Text style={[styles.metaText, { color: colors.textDim }]}>{publishDate}</Text>
            {duration ? (
              <>
                <Clock size={14} color={colors.textDim} />
                <Text style={[styles.metaText, { color: colors.textDim }]}>{duration}</Text>
              </>
            ) : null}
            {instagramUrl ? (
              <Pressable onPress={() => Linking.openURL(instagramUrl)} hitSlop={8}>
                <AtSign size={16} color={colors.accent} />
              </Pressable>
            ) : null}
          </View>

          {spotifyEmbedUrl ? (
            <View style={styles.section}>
              <Text style={[styles.eyebrow, { color: colors.textFaint }]}>
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
              <Text style={[styles.description, { color: colors.text }]}>{shownDescription}</Text>
              {collapsible ? (
                <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                  <Text style={[styles.toggle, { color: colors.accent }]}>
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

          <Text style={[styles.footerCaption, { color: colors.textFaint }]}>
            {t('podcast.recordedOn').replace('{date}', publishDate)}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.floatingBar, { top: insets.top + 8 }]}>
        <FloatingButton onPress={() => router.back()}>
          <ArrowLeft size={20} color={OVERLAY.white} />
        </FloatingButton>
        <View style={styles.floatingActions}>
          {canEdit ? (
            <FloatingButton onPress={onEdit}>
              <Pencil size={18} color={OVERLAY.white} />
            </FloatingButton>
          ) : null}
          {canDelete ? (
            <FloatingButton onPress={onDelete}>
              <Trash2 size={18} color={colors.danger} />
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
  heroPlayer: {
    flex: 1,
    backgroundColor: '#000',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: OVERLAY.youtube,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchTag: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: OVERLAY.scrimButton,
    borderRadius: RADII.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  watchTagText: {
    color: OVERLAY.white,
    fontSize: 12,
    fontWeight: '600',
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
    alignSelf: 'flex-start',
    backgroundColor: OVERLAY.gold,
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  epBadgeText: {
    color: OVERLAY.onGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
