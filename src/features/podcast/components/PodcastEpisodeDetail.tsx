import { Stack } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Mic, Pencil, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EpisodeVideoPlayer } from '@/features/podcast/components/EpisodeVideoPlayer';
import {
  extractYoutubeIdFromUrl,
  getConsumedBlocks,
  getDescription,
  getDuration,
  getSocialLinks,
  getSpotifyEmbedUrl,
  getYoutubeId,
  type ResolvedSocialLink,
} from '@/features/podcast/services/episodeMeta';
import { Badge } from '@/shared/components/Badge';
import { BlockRenderer } from '@/shared/components/content/BlockRenderer';
import { InstagramIcon } from '@/shared/components/icons/InstagramIcon';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { MAX_CONTENT_WIDTH, RADII } from '@/shared/constants/theme';
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
const FLOATING_BAR_INSET = 8;
const FLOATING_BUTTON_SIZE = 40;
/** How far the fade runs, ending as the hero's last pixel leaves the bar. */
const HEADER_FADE_DISTANCE = 40;
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

// The sections below are extracted out of PodcastEpisodeDetail's render to
// keep its cognitive complexity down (typescript:S3776) — each owns one
// self-contained, independently-toggled piece of the layout.

function EpisodeHero({
  hasVideo,
  youtubeId,
  heroVideoUrl,
  heroUri,
  colors,
}: {
  hasVideo: boolean;
  youtubeId: string | null;
  heroVideoUrl: string | null;
  heroUri: string | null;
  colors: ReturnType<typeof useTheme>;
}) {
  if (hasVideo) {
    return <EpisodeVideoPlayer youtubeId={youtubeId} videoUrl={heroVideoUrl} poster={heroUri} height={HERO_HEIGHT} />;
  }
  return heroUri ? (
    <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
  ) : (
    <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
      <Mic size={48} color={colors.textMuted} />
    </View>
  );
}

// Every social link on the post, not just Instagram. Wraps rather than
// sharing the meta row: the row is a fixed set of facts, and an author can
// add any number of these.
function SocialLinksRow({ links, colors }: { links: ResolvedSocialLink[]; colors: ReturnType<typeof useTheme> }) {
  if (links.length === 0) return null;
  return (
    <View style={styles.socialRow}>
      {links.map((link) => (
        <Pressable
          key={link.url}
          onPress={() => Linking.openURL(link.url)}
          hitSlop={6}
          accessibilityRole="link"
          accessibilityLabel={`Open ${link.label}`}
          style={({ pressed }) => [
            styles.socialChip,
            { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}>
          {link.isInstagram ? <InstagramIcon size={14} color={colors.primary} /> : null}
          <Text style={[styles.socialLabel, { color: colors.textPrimary }]}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SpotifyEmbedSection({
  url,
  colors,
  t,
}: {
  url: string;
  colors: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{t('podcast.listenOnSpotify').toUpperCase()}</Text>
      <View style={styles.spotifyEmbed}>
        {Platform.OS === 'web' ? (
          /* @ts-ignore web-only element */
          <iframe
            src={url}
            style={{ width: '100%', height: 152, border: 'none', borderRadius: 12 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <RNWebView source={{ uri: url }} style={styles.spotifyWebView} scrollEnabled={false} allowsInlineMediaPlayback />
        )}
      </View>
    </View>
  );
}

function DescriptionSection({
  description,
  shownDescription,
  collapsible,
  expanded,
  onToggle,
  colors,
  t,
}: {
  description: string;
  shownDescription: string;
  collapsible: boolean;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  if (!description) return null;
  return (
    <View>
      <Text style={[styles.description, { color: colors.textPrimary }]}>{shownDescription}</Text>
      {collapsible ? (
        <Pressable onPress={onToggle} hitSlop={8}>
          <Text style={[styles.toggle, { color: colors.primary }]}>
            {expanded ? t('podcast.showLess') : t('podcast.showMore')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Blocks have no stable id (shared/types/content-blocks.ts), and this list is
// read-only display of a fixed, already-fetched post — content, not the
// array index, both satisfies typescript:S6479 and stays stable across
// re-renders of the same post.
function ExtraBlocksSection({ blocks }: { blocks: Post['blocks'] }) {
  if (blocks.length === 0) return null;
  return (
    <View style={styles.extraBlocks}>
      {blocks.map((block) => (
        <BlockRenderer key={JSON.stringify(block)} block={block} />
      ))}
    </View>
  );
}

function FloatingActionsBar({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  colors,
  t,
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View style={styles.floatingActions}>
      {canEdit ? (
        <FloatingButton onPress={onEdit} label={t('podcast.editEpisode')}>
          <Pencil size={18} color={OVERLAY.white} />
        </FloatingButton>
      ) : null}
      {canDelete ? (
        <FloatingButton onPress={onDelete} label={t('podcast.deleteEpisode')}>
          <Trash2 size={18} color={colors.destructive} />
        </FloatingButton>
      ) : null}
    </View>
  );
}

export function PodcastEpisodeDetail({ post, episodeNumber, canEdit, canDelete, onBack, onEdit, onDelete }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const youtubeId = getYoutubeId(post);
  const spotifyEmbedUrl = getSpotifyEmbedUrl(post);
  const socialLinks = getSocialLinks(post);
  const duration = getDuration(post);
  const description = getDescription(post);

  const [expanded, setExpanded] = useState(false);

  // The action bar is pinned so Back stays reachable at any scroll position,
  // which means that once the hero scrolls past it the buttons sit on top of
  // ordinary content — over the Spotify embed, over the title. A background
  // fades in behind them as the hero leaves, so they land on a surface of
  // their own instead of colliding with whatever is underneath.
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = insets.top + FLOATING_BAR_INSET * 2 + FLOATING_BUTTON_SIZE;
  const fadeEnd = Math.max(1, HERO_HEIGHT - headerHeight);
  const headerOpacity = scrollY.interpolate({
    inputRange: [Math.max(0, fadeEnd - HEADER_FADE_DISTANCE), fadeEnd],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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
  const consumedBlocks = getConsumedBlocks(post);
  const extraBlocks = post.blocks.filter((b) => {
    if (consumedBlocks.has(b)) return false;
    if (b.type === 'video') {
      if (b === heroFileBlock) return false;
      if (youtubeId && b.data.url && extractYoutubeIdFromUrl(b.data.url) === youtubeId) return false;
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}>
        <View style={styles.hero}>
          <EpisodeHero hasVideo={hasVideo} youtubeId={youtubeId} heroVideoUrl={heroVideoUrl} heroUri={heroUri} colors={colors} />
        </View>

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
          </View>

          <SocialLinksRow links={socialLinks} colors={colors} />

          {spotifyEmbedUrl ? <SpotifyEmbedSection url={spotifyEmbedUrl} colors={colors} t={t} /> : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <DescriptionSection
            description={description}
            shownDescription={shownDescription}
            collapsible={collapsible}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            colors={colors}
            t={t}
          />

          <ExtraBlocksSection blocks={extraBlocks} />

          <Text style={[styles.footerCaption, { color: colors.textMuted }]}>
            {t('podcast.recordedOn', { date: publishDate })}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* Painted before the bar so the buttons stay on top of it. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.headerBackground,
          {
            height: headerHeight,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            opacity: headerOpacity,
          },
        ]}
      />

      <View style={[styles.floatingBar, { top: insets.top + FLOATING_BAR_INSET }]}>
        <FloatingButton onPress={onBack} label={t('podcast.back')}>
          <ArrowLeft size={20} color={OVERLAY.white} />
        </FloatingButton>
        <FloatingActionsBar canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} colors={colors} t={t} />
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
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    borderRadius: FLOATING_BUTTON_SIZE / 2,
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
  // Wraps: an author can add any number of links, and on a phone three or
  // four already overflow a single line.
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: '600',
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
