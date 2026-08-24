import { Image } from 'expo-image';
import { ChevronDown, ChevronUp, Music } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import type { FeaturedPlayerContent } from '@/features/home/hooks/useHomeFeaturedPlayer';
import { extractYoutubeIdFromUrl } from '@/features/podcast/services/episodeMeta';
import { extractSpotifyInfo } from '@/features/podcast/services/spotify';
import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

// Loaded lazily so the web bundle never executes native-only modules — same
// pattern as PodcastEpisodeDetail's Spotify WebView.
//
// Spotify's embed loads fine as a plain WebView URL. YouTube's does not: its
// iframe player checks the referring origin, and a WebView pointed straight
// at an /embed/ URL has none, so it refuses with "Error 153 — video player
// configuration error" instead of playing. react-native-youtube-iframe hosts
// the player in a document with a real base URL, which is why the hero video
// in EpisodeVideoPlayer works; this bar now goes through the same component
// rather than assuming a compact player could get away with less.
let RNWebView: any = null;
let YoutubePlayer: any = null;
if (Platform.OS !== 'web') {
  RNWebView = require('react-native-webview').WebView;
  YoutubePlayer = require('react-native-youtube-iframe').default;
}

/**
 * Spotify's episode embed is a fixed-height player, not an aspect-ratio one,
 * and it swaps its own internal layout on the width it is given: a stacked
 * player when narrow, a single row when wide. Pinning it to the narrow height
 * at every width is what left a band of dead space under the player on wide
 * screens — the iframe kept its 152px box and drew an 80px row inside it.
 *
 * The threshold is where Spotify's row layout takes over in practice; a phone
 * (~360pt of card) stays comfortably below it and a tablet or the web build
 * above. Erring high is the safe side: too tall only re-creates today's gap,
 * while too short would clip Spotify's controls.
 */
const SPOTIFY_STACKED_HEIGHT = 152;
const SPOTIFY_ROW_HEIGHT = 80;
const SPOTIFY_ROW_MIN_WIDTH = 480;

/** YouTube is a video: anything but 16:9 letterboxes or crops the frame. */
const YOUTUBE_ASPECT_RATIO = 16 / 9;

/**
 * Kept next to the style that applies it — the embed's usable width is the
 * card's measured width minus this border on both sides and the wrapper's
 * padding, and the two must not drift apart.
 */
const CARD_BORDER_WIDTH = 1;

type Props = {
  content: FeaturedPlayerContent;
};

/**
 * Height the embed should occupy for `width` points of usable card width.
 * Falls back to the stacked height before the first layout pass, so the embed
 * never appears at zero height for a frame.
 */
function embedHeightFor(playbackType: string | undefined, width: number): number {
  if (playbackType === 'YOUTUBE') {
    return width > 0 ? Math.round(width / YOUTUBE_ASPECT_RATIO) : SPOTIFY_STACKED_HEIGHT;
  }
  return width >= SPOTIFY_ROW_MIN_WIDTH ? SPOTIFY_ROW_HEIGHT : SPOTIFY_STACKED_HEIGHT;
}

/**
 * README-home-featured-mini-player.md §15/§16: a reusable, source-agnostic
 * Featured Player. Renders a compact bar by default; tapping expands it
 * in-place into the real playback embed (Spotify WebView or YouTube iframe —
 * same embed mechanics as PodcastEpisodeDetail/EpisodeVideoPlayer, reused
 * rather than duplicated) so the bar becomes an actual player instead of a
 * link out to another screen. Internally dispatches on
 * `content.playback.type` per §16 — the component itself never mentions
 * Spotify/YouTube in its public shape.
 *
 * Carries the brand yellow rather than the neutral card recipe the rest of
 * the app uses — a solid primary fill with onPrimary text, so the bar reads
 * as the one featured thing on a screen it shares with the masonry gallery
 * beneath it. Note the accent stops at the bar: once expanded, the embed
 * below paints its own chrome (Spotify green, YouTube red) inside the
 * WebView, which isn't ours to theme.
 */
export function MiniPodcastPlayer({ content }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [embedWidth, setEmbedWidth] = useState(0);
  const embed = resolveEmbed(content);
  const embedHeight = embedHeightFor(content.playback?.type, embedWidth);

  // Measured on the card rather than on the embed itself: the card is laid
  // out while still collapsed, so the embed has its final height on the very
  // first frame it renders instead of resizing just after the user taps.
  const handleLayout = (width: number) => {
    const usable = width - 2 * CARD_BORDER_WIDTH - 2 * Spacing.two;
    setEmbedWidth((current) => (current === usable ? current : usable));
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.primary, borderColor: theme.primary }]}
      onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}>
      <Pressable
        style={styles.bar}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse featured player' : 'Expand featured player'}
      >
        <View style={[styles.artwork, { backgroundColor: theme.surface }]}>
          {content.thumbnailUrl ? (
            <Image source={{ uri: content.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <Music size={18} color={theme.primary} />
          )}
        </View>

        {/* Text and chevron take onPrimary: on a solid primary fill the
            normal textPrimary/textSecondary pair is near-invisible. The
            subtitle leans on opacity rather than a second token, since the
            palette has no "muted onPrimary". */}
        <View style={styles.text}>
          <ThemedText type="smallBold" themeColor="onPrimary" numberOfLines={1}>
            {content.title}
          </ThemedText>
          {content.subtitle ? (
            <ThemedText type="small" themeColor="onPrimary" style={styles.subtitle} numberOfLines={1}>
              {content.subtitle}
            </ThemedText>
          ) : null}
        </View>

        {expanded ? <ChevronDown size={20} color={theme.onPrimary} /> : <ChevronUp size={20} color={theme.onPrimary} />}
      </Pressable>

      {expanded && embed ? (
        <View style={styles.embedWrapper}>
          <View style={{ height: embedHeight }}>{renderEmbed(embed, embedHeight)}</View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Both platforms need the embed URL, but native YouTube additionally needs
 * the bare video id — its player is a component, not a URL in a WebView.
 */
type ResolvedEmbed =
  | { kind: 'youtube'; url: string; videoId: string }
  | { kind: 'webEmbed'; url: string };

function resolveEmbed(content: FeaturedPlayerContent): ResolvedEmbed | null {
  const playback = content.playback;
  if (!playback || !playback.reference) return null;

  if (playback.type === 'SPOTIFY_EMBED') {
    const info = extractSpotifyInfo(playback.reference);
    return info
      ? { kind: 'webEmbed', url: `https://open.spotify.com/embed/${info.spotifyType}/${info.spotifyId}` }
      : null;
  }

  if (playback.type === 'YOUTUBE') {
    const videoId = extractYoutubeIdFromUrl(playback.reference);
    return videoId
      ? { kind: 'youtube', url: `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0`, videoId }
      : null;
  }

  return null;
}

function renderEmbed(embed: ResolvedEmbed, height: number) {
  if (Platform.OS === 'web') {
    return (
      // @ts-ignore web-only element
      <iframe
        src={embed.url}
        // Fills the sized box its parent computed, so native and web are
        // driven by the same height rather than each carrying their own.
        style={{ width: '100%', height: '100%', border: 'none', borderRadius: RADII.control }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    );
  }

  // Native YouTube: see the require block at the top for why this can't be a
  // WebView pointed at embed.url.
  if (embed.kind === 'youtube') {
    return <YoutubePlayer height={height} videoId={embed.videoId} />;
  }

  return <RNWebView source={{ uri: embed.url }} style={styles.webView} scrollEnabled={false} allowsInlineMediaPlayback />;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: CARD_BORDER_WIDTH,
    borderRadius: RADII.card,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: RADII.control,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    opacity: 0.7,
  },
  // No height of its own — it wraps the sized embed. It used to carry the
  // embed height *and* this padding, and React Native's border-box sizing
  // then subtracted the padding from it, handing the embed 8pt less than the
  // height Spotify draws against.
  embedWrapper: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  webView: {
    flex: 1,
    borderRadius: RADII.control,
  },
});
