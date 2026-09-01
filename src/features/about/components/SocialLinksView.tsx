import { AtSign } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { InstagramIcon } from '@/shared/components/icons/InstagramIcon';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { SocialLinksBlock } from '@/shared/types/content-blocks';

/**
 * A `social-links` block: an optional heading and a wrapping row of chips, each
 * showing the admin-configured `@username` and opening its URL. lucide dropped
 * brand icons, so Instagram uses this repo's hand-drawn mark
 * (shared/components/icons/InstagramIcon) and every other platform shows a
 * generic `AtSign` — matching how PodcastEpisodeDetail renders its social row.
 */
export function SocialLinksView({ data }: { data: SocialLinksBlock['data'] }) {
  const colors = useTheme();
  const links = data.links ?? [];
  if (links.length === 0) return null;

  return (
    <View style={styles.section}>
      {data.title ? (
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{data.title.toUpperCase()}</Text>
      ) : null}
      <View style={styles.row}>
        {links.map((link, i) => (
          <Pressable
            key={`${link.url}-${i}`}
            onPress={() => link.url && Linking.openURL(link.url)}
            hitSlop={6}
            accessibilityRole="link"
            accessibilityLabel={`Open ${link.username || link.url}`}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
            ]}>
            {link.platform === 'INSTAGRAM' ? (
              <InstagramIcon size={14} color={colors.primary} />
            ) : (
              <AtSign size={14} color={colors.primary} />
            )}
            <Text style={[styles.label, { color: colors.textPrimary }]}>{link.username || link.url}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
    gap: Spacing.two,
  },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
