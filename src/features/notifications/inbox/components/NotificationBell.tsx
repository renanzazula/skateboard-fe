import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatBadgeCount } from '@/features/notifications/inbox/inboxState';
import { useUnreadNotificationCount } from '@/features/notifications/inbox/hooks/useUnreadNotificationCount';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

const BELL_SIZE = 24;
const BADGE_SIZE = 18;

/** Home header's bell: opens the Notifications screen, badge shows the unread count. */
export function NotificationBell() {
  const theme = useTheme();
  const { t } = useTranslation();
  const count = useUnreadNotificationCount();
  const badge = formatBadgeCount(count);

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        badge ? t('notifications.openWithCount', { count: badge }) : t('notifications.open')
      }
      style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.7 : 1 }]}>
      <Bell size={BELL_SIZE} color={theme.textPrimary} />
      {badge ? (
        <View
          testID="notification-bell-badge"
          style={[styles.badge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
          <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
