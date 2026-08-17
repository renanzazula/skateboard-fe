import { Image } from 'expo-image';
import { Film } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { RADII } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Video } from '@/shared/types/video';

// README_HOME_DASHBOARD.md §6: deterministic per-index height variation for
// a collage feel — never random-per-render, or the grid would jump while
// scrolling. §7: thumbnail-only, no title/metadata overlay for this first
// version, to keep the dashboard visually clean.
const HEIGHTS = [170, 190, 210, 180, 220];

type Props = {
  video: Video;
  onPress: (video: Video) => void;
  index: number;
};

export function VideoThumbnailCard({ video, onPress, index }: Props) {
  const theme = useTheme();
  const height = HEIGHTS[index % HEIGHTS.length];

  return (
    <Pressable style={[styles.card, { height }]} onPress={() => onPress(video)}>
      {video.thumbnailUrl ? (
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: theme.surface }]}>
          <Film size={28} color={theme.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: RADII.card,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
