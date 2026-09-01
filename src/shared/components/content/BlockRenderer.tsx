import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ExternalLink, ImageOff, Music, Quote } from 'lucide-react-native';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ContentBlock } from '@/shared/types/content-blocks';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

// Ported from rork-standard-app/expo's modules/feed/components/BlockRenderer.tsx.
// Originally lived under src/features/podcast; moved to shared/ when the About
// Us page began reusing the same content-block model (shared/types/content-blocks.ts).
//
// Loaded lazily so the web bundle never executes native-only modules — the
// same pattern MiniPodcastPlayer and EpisodeVideoPlayer use.
//
// YouTube needs its own component rather than a WebView on the /embed/ URL:
// the iframe player validates the referring origin, and a WebView pointed
// straight at that URL presents none, so it refuses with "Error 153" instead
// of playing. react-native-youtube-iframe hosts the player in a document with
// a real base URL. Vimeo performs no such check, so a plain WebView is enough.
let RNWebView: any = null;
let YoutubePlayer: any = null;
if (Platform.OS !== 'web') {
  RNWebView = require('react-native-webview').WebView;
  YoutubePlayer = require('react-native-youtube-iframe').default;
}

/** A video is 16:9; anything else letterboxes or crops the frame. */
const VIDEO_ASPECT_RATIO = 16 / 9;

type Props = { block: ContentBlock };

/**
 * An embed block, playing in place on both platforms.
 *
 * Native used to render a "Watch on YouTube" card that left the app, while
 * web embedded the real player — so the same post read as two different
 * things depending on where it was opened. It plays inline everywhere now.
 *
 * Height comes from the measured width so the frame keeps 16:9 at any width,
 * rather than the fixed height the web branch has always used.
 */
function EmbedBlockView({ platform, id }: { platform: 'youtube' | 'vimeo'; id: string }) {
  const [width, setWidth] = useState(0);
  const height = width > 0 ? Math.round(width / VIDEO_ASPECT_RATIO) : undefined;

  if (Platform.OS === 'web') {
    const embedUrl =
      platform === 'youtube'
        ? `https://www.youtube.com/embed/${id}`
        : `https://player.vimeo.com/video/${id}`;
    return (
      <View style={styles.embedContainer}>
        {/* @ts-ignore web-only element */}
        <iframe src={embedUrl} style={{ width: '100%', height: 300, border: 'none' }} allowFullScreen />
      </View>
    );
  }

  return (
    <View
      style={styles.embedContainer}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => (current === next ? current : next));
      }}>
      {height === undefined ? null : platform === 'youtube' ? (
        <YoutubePlayer height={height} videoId={id} />
      ) : (
        <RNWebView
          source={{ uri: `https://player.vimeo.com/video/${id}` }}
          style={{ height }}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
        />
      )}
    </View>
  );
}

function NativeVideoBlock({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  return (
    <View style={styles.embedContainer}>
      <VideoView player={player} style={styles.video} allowsPictureInPicture />
    </View>
  );
}

/**
 * An image block, with the failure case drawn rather than left blank.
 *
 * The image reserves a fixed 240pt whether or not it loads, so a URL that
 * 404s or blocks hotlinking used to leave a tall empty band with the caption
 * stranded underneath — indistinguishable from a layout bug, and silent in
 * the console. Authors paste third-party URLs into this field, so that is a
 * routine outcome, not an edge case.
 */
function ImageBlockView({ url, caption }: { url: string; caption?: string }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.imageBlock}>
      {failed ? (
        <View style={[styles.imageFallback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ImageOff size={20} color={colors.textMuted} />
          <Text style={[styles.caption, { color: colors.textMuted }]}>{t('podcast.imageLoadFailed')}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="cover"
          onError={({ nativeEvent }) => {
            console.warn(`[block] image failed to load from ${url}: ${nativeEvent?.error ?? 'unknown error'}`);
            setFailed(true);
          }}
        />
      )}
      {caption ? <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text> : null}
    </View>
  );
}

/**
 * A hero block — a wide image with an optional headline / subheadline drawn
 * over its lower half. Used as the top section of the About Us page.
 */
function HeroBlockView({
  imageUrl,
  headline,
  subheadline,
}: {
  imageUrl: string;
  headline?: string;
  subheadline?: string;
}) {
  const colors = useTheme();

  return (
    <View style={[styles.hero, { backgroundColor: colors.surface }]}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {headline || subheadline ? (
        <View style={styles.heroTextWrap}>
          {headline ? <Text style={styles.heroHeadline}>{headline}</Text> : null}
          {subheadline ? <Text style={styles.heroSubheadline}>{subheadline}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function BlockRenderer({ block }: Props) {
  const colors = useTheme();

  if ('hidden' in block && block.hidden) return null;

  switch (block.type) {
    case 'text':
      return <Text style={[styles.text, { color: colors.textPrimary }]}>{block.data.html.replace(/<[^>]+>/g, '')}</Text>;

    case 'image':
      return <ImageBlockView url={block.data.url} caption={block.data.caption} />;

    case 'hero':
      return (
        <HeroBlockView
          imageUrl={block.data.imageUrl}
          headline={block.data.headline}
          subheadline={block.data.subheadline}
        />
      );

    case 'video':
      if (Platform.OS === 'web') {
        return (
          <View style={styles.embedContainer}>
            {/* @ts-ignore web-only element */}
            <video src={block.data.url} controls style={{ width: '100%', maxHeight: 300 }} />
          </View>
        );
      }
      return <NativeVideoBlock url={block.data.url} />;

    case 'quote':
      return (
        <View style={[styles.quoteBlock, { borderLeftColor: colors.primary, backgroundColor: colors.surface }]}>
          <Quote size={20} color={colors.primary} style={styles.quoteIcon} />
          <Text style={[styles.quoteText, { color: colors.textPrimary }]}>{block.data.text}</Text>
          {block.data.author ? (
            <Text style={[styles.quoteAuthor, { color: colors.textSecondary }]}>— {block.data.author}</Text>
          ) : null}
        </View>
      );

    case 'embed':
      return <EmbedBlockView platform={block.data.platform} id={block.data.id} />;

    case 'spotify': {
      const embedSrc = `https://open.spotify.com/embed/${block.data.spotifyType}/${block.data.spotifyId}`;
      if (Platform.OS === 'web') {
        return (
          <View style={styles.embedContainer}>
            {/* @ts-ignore web-only element */}
            <iframe
              src={embedSrc}
              style={{ width: '100%', height: 152, border: 'none', borderRadius: 12 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </View>
        );
      }
      return (
        <Pressable
          style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => Linking.openURL(block.data.url)}>
          <Music size={24} color={colors.primary} />
          <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>
            {block.data.spotifyType.charAt(0).toUpperCase() + block.data.spotifyType.slice(1)} on Spotify
          </Text>
          <ExternalLink size={16} color={colors.textSecondary} />
        </Pressable>
      );
    }

    case 'gallery':
      return (
        <View style={styles.gallery}>
          {block.data.urls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.galleryImage} resizeMode="cover" />
          ))}
        </View>
      );

    case 'link':
      return (
        <Pressable
          style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => block.data.url && Linking.openURL(block.data.url)}>
          <ExternalLink size={24} color={colors.primary} />
          <View style={styles.linkTextContainer}>
            {block.data.title ? (
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>{block.data.title}</Text>
            ) : null}
            <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>
              {block.data.url}
            </Text>
            {block.data.description ? (
              <Text style={[styles.linkDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {block.data.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );

    default:
      // `social-links` is rendered by the About Us page itself (it needs the
      // platform-icon set), so it is intentionally not handled here.
      return null;
  }
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },
  imageBlock: {
    marginBottom: 16,
  },
  imageFallback: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  caption: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  hero: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  heroTextWrap: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 4,
  },
  heroHeadline: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubheadline: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  quoteBlock: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  quoteIcon: {
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    marginTop: 8,
  },
  embedContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 220,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  galleryImage: {
    width: '48%',
    height: 160,
    borderRadius: 8,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkUrl: {
    fontSize: 13,
    marginTop: 2,
  },
  linkDescription: {
    fontSize: 13,
    marginTop: 4,
  },
});
