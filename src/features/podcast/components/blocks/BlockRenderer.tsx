import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ExternalLink, ImageOff, Music, Quote, Video } from 'lucide-react-native';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Block } from '@/shared/types/posts';
import { useTheme } from '@/shared/hooks/use-theme';

// Ported from rork-standard-app/expo's modules/feed/components/BlockRenderer.tsx.
type Props = { block: Block };

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
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.imageBlock}>
      {failed ? (
        <View style={[styles.imageFallback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ImageOff size={20} color={colors.textMuted} />
          <Text style={[styles.caption, { color: colors.textMuted }]}>Image could not be loaded</Text>
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

export function BlockRenderer({ block }: Props) {
  const colors = useTheme();

  switch (block.type) {
    case 'text':
      return <Text style={[styles.text, { color: colors.textPrimary }]}>{block.data.html.replace(/<[^>]+>/g, '')}</Text>;

    case 'image':
      return <ImageBlockView url={block.data.url} caption={block.data.caption} />;

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

    case 'embed': {
      const embedUrl =
        block.data.platform === 'youtube'
          ? `https://www.youtube.com/embed/${block.data.id}`
          : `https://player.vimeo.com/video/${block.data.id}`;
      if (Platform.OS === 'web') {
        return (
          <View style={styles.embedContainer}>
            {/* @ts-ignore web-only element */}
            <iframe src={embedUrl} style={{ width: '100%', height: 300, border: 'none' }} allowFullScreen />
          </View>
        );
      }
      const label = block.data.platform === 'youtube' ? 'YouTube' : 'Vimeo';
      const watchUrl =
        block.data.platform === 'youtube'
          ? `https://www.youtube.com/watch?v=${block.data.id}`
          : `https://vimeo.com/${block.data.id}`;
      return (
        <Pressable
          style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => Linking.openURL(watchUrl)}>
          <Video size={24} color={colors.primary} />
          <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Watch on {label}</Text>
          <ExternalLink size={16} color={colors.textSecondary} />
        </Pressable>
      );
    }

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
