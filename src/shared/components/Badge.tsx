import { StyleSheet, Text, type TextStyle } from 'react-native';

import { Colors, RADII } from '@/shared/constants/theme';

type Props = {
  label: string;
  style?: TextStyle;
};

/**
 * Small yellow/black pill for EP numbers, NEW/LIVE/FEATURED tags, etc. (doc §17).
 * Sits directly on imagery in every current usage, so it uses the raw
 * primary/onPrimary literals rather than `useTheme()` — same reasoning as
 * the overlay colors it sits next to (EpisodeCard, PodcastEpisodeDetail).
 */
export function Badge({ label, style }: Props) {
  return <Text style={[styles.badge, style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    color: Colors.onPrimary,
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
});
