import { Image } from 'expo-image';
import { Film } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useImageAspectRatio } from '@/features/home/hooks/useImageAspectRatio';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Video } from '@/shared/types/video';

// Only used while a tile's real ratio is still unknown (no backend dimensions,
// non-YouTube URL, probe still in flight). 16:9 matches the overwhelming
// majority of the catalog, so the occasional reflow is as small as possible.
const FALLBACK_ASPECT_RATIO = 16 / 9;

// Half of the gallery's gutter — each tile insets by this on every side, so
// neighbouring tiles sit GUTTER apart and the grid reads as one surface.
// README_HOME_VIDEO_GALLERY_LAYOUT.md asks for 4–8px.
export const TILE_INSET = 3;

type Props = {
  video: Video;
  onPress: (video: Video) => void;
};

/**
 * One masonry tile: the thumbnail and nothing else — no border, no card
 * background, no fixed height. Height comes entirely from the image's own
 * aspect ratio so portrait, square and landscape thumbnails can coexist
 * without cropping or stretching (README_HOME_VIDEO_GALLERY_LAYOUT.md).
 */
export function HomeVideoGalleryItem({ video, onPress }: Props) {
  const theme = useTheme();

  // Dimensions the backend captured win outright — known before first paint,
  // so a tile sized by them never shifts.
  const knownRatio =
    video.thumbnailWidth && video.thumbnailHeight ? video.thumbnailWidth / video.thumbnailHeight : undefined;
  const ratio = useImageAspectRatio(video.thumbnailUrl, knownRatio);

  return (
    <Pressable
      style={styles.wrapper}
      onPress={() => onPress(video)}
      accessibilityRole="button"
      accessibilityLabel={video.title}>
      <View style={[styles.media, { aspectRatio: ratio ?? FALLBACK_ASPECT_RATIO, backgroundColor: theme.surface }]}>
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            // The container already carries the image's own ratio, so cover
            // fills it without cropping anything meaningful.
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Film size={24} color={theme.textMuted} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    margin: TILE_INSET,
  },
  media: {
    width: '100%',
    // Deliberately no borderRadius/borderWidth: the reference is edge-to-edge
    // rectangles. The background doubles as the placeholder while loading.
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
