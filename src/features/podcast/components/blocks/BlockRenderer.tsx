import { useVideoPlayer, VideoView } from 'expo-video';
import { ExternalLink, Music, Quote, Video } from 'lucide-react-native';
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

export function BlockRenderer({ block }: Props) {
  const colors = useTheme();

  switch (block.type) {
    case 'text':
      return <Text style={[styles.text, { color: colors.text }]}>{block.data.html.replace(/<[^>]+>/g, '')}</Text>;

    case 'image':
      return (
        <View style={styles.imageBlock}>
          <Image source={{ uri: block.data.url }} style={styles.image} resizeMode="cover" />
          {block.data.caption ? (
            <Text style={[styles.caption, { color: colors.textDim }]}>{block.data.caption}</Text>
          ) : null}
        </View>
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
        <View style={[styles.quoteBlock, { borderLeftColor: colors.accent, backgroundColor: colors.surface }]}>
          <Quote size={20} color={colors.accent} style={styles.quoteIcon} />
          <Text style={[styles.quoteText, { color: colors.text }]}>{block.data.text}</Text>
          {block.data.author ? (
            <Text style={[styles.quoteAuthor, { color: colors.textDim }]}>— {block.data.author}</Text>
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
          <Video size={24} color={colors.accent} />
          <Text style={[styles.linkTitle, { color: colors.text }]}>Watch on {label}</Text>
          <ExternalLink size={16} color={colors.textDim} />
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
          <Music size={24} color={colors.accent} />
          <Text style={[styles.linkTitle, { color: colors.text }]}>
            {block.data.spotifyType.charAt(0).toUpperCase() + block.data.spotifyType.slice(1)} on Spotify
          </Text>
          <ExternalLink size={16} color={colors.textDim} />
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
          <ExternalLink size={24} color={colors.accent} />
          <View style={styles.linkTextContainer}>
            {block.data.title ? (
              <Text style={[styles.linkTitle, { color: colors.text }]}>{block.data.title}</Text>
            ) : null}
            <Text style={[styles.linkUrl, { color: colors.textDim }]} numberOfLines={1}>
              {block.data.url}
            </Text>
            {block.data.description ? (
              <Text style={[styles.linkDescription, { color: colors.textDim }]} numberOfLines={2}>
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
