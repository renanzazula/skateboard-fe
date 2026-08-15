import { ScrollView, StyleSheet } from 'react-native';

import { CategoryChip } from '@/features/podcast/components/CategoryChip';
import type { Category } from '@/shared/types/category';

// README_YOUTUBE_PLAYLIST_CATEGORIES_MIGRATION.md §22: horizontally
// scrollable so an arbitrary, growing number of YouTube playlists still fits.
type Props = {
  categories: Category[];
  selectedSlug: string | undefined;
  onSelect: (category: Category) => void;
};

export function CategorySelector({ categories, selectedSlug, onSelect }: Props) {
  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          label={category.name}
          selected={category.slug === selectedSlug}
          onPress={() => onSelect(category)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingRight: 8,
    paddingBottom: 4,
  },
});
