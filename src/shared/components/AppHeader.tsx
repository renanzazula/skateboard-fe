import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

/**
 * The one header every screen renders, so the bar is the same height across
 * the whole app. It's a fixed height rather than a minimum on purpose: a
 * screen with no subtitle would otherwise sit shorter than one with a
 * subtitle, and the bar would visibly resize as you move between tabs.
 *
 * Two shapes share that shell:
 *  - the default title (+ optional subtitle, + optional back arrow), used by
 *    Settings, its sub-pages and the Podcast tab;
 *  - arbitrary `children`, used by Home for its avatar / logo / username row.
 */
export const HEADER_CONTENT_HEIGHT = 46;

type Props = {
  title?: string;
  subtitle?: string | null;
  showBack?: boolean;
  /** Replaces the title stack entirely — the row shell and height still apply. */
  children?: ReactNode;
};

export function AppHeader({ title, subtitle, showBack = false, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Same guard as PodcastPostScreen: router.back() is a no-op when this screen
  // is the first entry on the stack (deep link, notification, or a direct
  // open/refresh on web), which would leave the arrow visibly dead.
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={styles.back}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <ArrowLeft size={22} color={theme.textPrimary} />
          </Pressable>
        ) : null}

        {children ?? (
          <View style={styles.titleStack}>
            {title ? (
              <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  row: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    height: HEADER_CONTENT_HEIGHT,
    justifyContent: 'center',
  },
  // Overlaid rather than in flow, so the title stays optically centred on the
  // screen whether or not a back arrow is present.
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
  subtitle: {
    fontSize: 13,
  },
});
