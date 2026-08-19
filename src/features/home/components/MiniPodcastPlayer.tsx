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
// pattern as PodcastEpisodeDetail's Spotify WebView. Both Spotify and
// YouTube embeds render through this one WebView (a YouTube iframe URL works
// the same way a Spotify embed URL does), so there's no need for the native
// react-native-youtube-iframe player EpisodeVideoPlayer uses for the full
// hero video — this bar is compact, not a hero.
let RNWebView: any = null;
if (Platform.OS !== 'web') {
  RNWebView = require('react-native-webview').WebView;
}

const EMBED_HEIGHT = 152;

type Props = {
  content: FeaturedPlayerContent;
};

/**
 * README-home-featured-mini-player.md §15/§16: a reusable, source-agnostic
 * Featured Player. Renders a compact bar by default; tapping expands it
 * in-place into the real playback embed (Spotify WebView or YouTube iframe —
 * same embed mechanics as PodcastEpisodeDetail/EpisodeVideoPlayer, reused
 * rather than duplicated) so the bar becomes an actual player instead of a
 * link out to another screen. Internally dispatches on
 * `content.playback.type` per §16 — the component itself never mentions
 * Spotify/YouTube in its public shape.
 */
export function MiniPodcastPlayer({ content }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const embedUrl = resolveEmbedUrl(content);

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
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
            <Music size={18} color={theme.textMuted} />
          )}
        </View>

        <View style={styles.text}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {content.title}
          </ThemedText>
          {content.subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {content.subtitle}
            </ThemedText>
          ) : null}
        </View>

        {expanded ? <ChevronDown size={20} color={theme.textSecondary} /> : <ChevronUp size={20} color={theme.textSecondary} />}
      </Pressable>

      {expanded && embedUrl ? <View style={styles.embedWrapper}>{renderEmbed(embedUrl)}</View> : null}
    </View>
  );
}

function resolveEmbedUrl(content: FeaturedPlayerContent): string | null {
  const playback = content.playback;
  if (!playback || !playback.reference) return null;

  if (playback.type === 'SPOTIFY_EMBED') {
    const info = extractSpotifyInfo(playback.reference);
    return info ? `https://open.spotify.com/embed/${info.spotifyType}/${info.spotifyId}` : null;
  }

  if (playback.type === 'YOUTUBE') {
    const youtubeId = extractYoutubeIdFromUrl(playback.reference);
    return youtubeId ? `https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0` : null;
  }

  return null;
}

function renderEmbed(embedUrl: string) {
  if (Platform.OS === 'web') {
    return (
      // @ts-ignore web-only element
      <iframe
        src={embedUrl}
        style={{ width: '100%', height: EMBED_HEIGHT, border: 'none', borderRadius: RADII.control }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    );
  }
  return <RNWebView source={{ uri: embedUrl }} style={styles.webView} scrollEnabled={false} allowsInlineMediaPlayback />;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
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
  embedWrapper: {
    height: EMBED_HEIGHT,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  webView: {
    flex: 1,
    borderRadius: RADII.control,
  },
});
