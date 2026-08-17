import { Image } from 'expo-image';
import { Film } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useImageAspectRatio } from '@/features/home/hooks/useImageAspectRatio';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Video } from '@/shared/types/video';

const DEFAULT_ASPECT_RATIO = 4 / 3;

type Props = {
  video: Video;
  onPress: (video: Video) => void;
};

export function HomeVideoGalleryItem({ video, onPress }: Props) {
  const theme = useTheme();
  const ratio = useImageAspectRatio(video.thumbnailUrl);

  return (
    <Pressable style={styles.wrapper} onPress={() => onPress(video)}>
      <View style={[styles.media, { aspectRatio: ratio ?? DEFAULT_ASPECT_RATIO }]}>
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: theme.surface }]}>
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
    margin: Spacing.one,
  },
  media: {
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
