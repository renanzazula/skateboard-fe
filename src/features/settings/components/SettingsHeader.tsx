import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  title: string;
  handle?: string | null;
  showBack?: boolean;
};

/** Centered title + `@handle` subtitle, with an overlaid left back arrow. Rendered inside every Settings screen's body — see .docs/SETTINGS_REDESIGN_2.md §5. */
export function SettingsHeader({ title, handle, showBack = true }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <ArrowLeft size={22} color={theme.textPrimary} />
          </Pressable>
        ) : null}

        <View style={styles.titleStack}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {handle ? (
            <Text style={[styles.handle, { color: theme.textSecondary }]} numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  row: {
    minHeight: 32,
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  titleStack: {
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  handle: {
    fontSize: 13,
  },
});
