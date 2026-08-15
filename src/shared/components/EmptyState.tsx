import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Icon + title + optional CTA for empty lists/screens (doc §19). */
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
        <Icon size={40} color={theme.primary} />
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="default" themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={onAction}>
          <ThemedText type="smallBold" themeColor="onPrimary">
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
  },
});
