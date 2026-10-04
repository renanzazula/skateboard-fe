import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

// Matches podcast-be's maxLength for ?search= — anything longer is a 400.
const MAX_SEARCH_LENGTH = 100;

type Props = {
  value: string;
  onChangeText: (value: string) => void;
};

/** Podcast list search: episode title or number, with a clear button once there's text. */
export function EpisodeSearchField({ value, onChangeText }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Search size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('podcast.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('podcast.searchLabel')}
        style={[styles.input, { color: colors.textPrimary }]}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        maxLength={MAX_SEARCH_LENGTH}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('podcast.clearSearch')}>
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
