import { Pressable, StyleSheet, Text, View } from 'react-native';

import { relativeTime } from '@/features/notifications/inbox/inboxState';
import type { InboxItem } from '@/features/notifications/inbox/types';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type Props = {
  item: InboxItem;
  now: number;
  onPress: (item: InboxItem) => void;
};

/**
 * One inbox row: a filled dot, tinted card and bold title while unread; a
 * hollow dot and plain card once read.
 */
export function NotificationListItem({ item, now, onPress }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const unread = !item.read;

  const age = relativeTime(item.createdAt, now);
  const ageLabel =
    age.unit === 'now'
      ? t('notifications.time.now')
      : age.unit === 'date'
        ? new Date(item.createdAt).toLocaleDateString()
        : t(`notifications.time.${age.unit}`, { count: age.count });

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={unread ? `${t('notifications.unread')}, ${item.title}` : item.title}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: unread ? theme.primarySoft : theme.surface,
          borderColor: unread ? theme.primary : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.header}>
        <View
          testID={unread ? 'notification-dot-unread' : 'notification-dot-read'}
          style={[
            styles.dot,
            unread
              ? { backgroundColor: theme.primary }
              : { borderWidth: 1.5, borderColor: theme.textSecondary },
          ]}
        />
        <Text
          style={[styles.title, { color: theme.textPrimary, fontWeight: unread ? '800' : '500' }]}
          numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>{ageLabel}</Text>
      </View>
      {item.body ? (
        <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={4}>
          {item.body}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    flex: 1,
    fontSize: 16,
  },
  time: {
    fontSize: 13,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
});
