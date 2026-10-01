import { CheckCheck, Bell } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { NotificationListItem, useNotificationInbox, type InboxItem } from '@/features/notifications/inbox';
import { openNotificationTarget } from '@/features/notifications/pushNavigation';
import { isBffError } from '@/shared/api/errors';
import { AppHeader } from '@/shared/components/AppHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

/**
 * The inbox opened from Home's bell. Sits on the root stack, above (tabs),
 * for the same reason as video/[slug]: back() returns to Home, and a tap on
 * an item can push the episode screen on top of it.
 */
export default function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const inbox = useNotificationInbox();
  const { load } = inbox;
  // Ages are computed against the moment the list was loaded rather than per
  // render, so rows don't relabel themselves while the list scrolls. Items
  // only ever exist alongside a loadedAt, so the 0 fallback never labels one.
  const now = inbox.loadedAt ? Date.parse(inbox.loadedAt) : 0;

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = useCallback(
    (item: InboxItem) => {
      inbox.markRead(item.notificationId);
      openNotificationTarget(item.data, 'inbox');
    },
    [inbox]
  );

  const canMarkAll = inbox.items.some((item) => !item.read) || inbox.unreadCount > 0;
  const firstLoad = inbox.status === 'loading' && inbox.items.length === 0;

  return (
    <ThemedView style={styles.container}>
      <AppHeader
        title={t('notifications.title')}
        showBack
        right={
          <Pressable
            onPress={inbox.markAllRead}
            disabled={!canMarkAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.markAllRead')}
            accessibilityState={{ disabled: !canMarkAll }}
            style={{ opacity: canMarkAll ? 1 : 0.35 }}>
            <CheckCheck size={24} color={theme.textPrimary} />
          </Pressable>
        }
      />
      <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />

      {inbox.error && inbox.items.length === 0 ? (
        <View style={styles.bannerWrap}>
          <ErrorBanner
            message={t('notifications.loadError')}
            detail={isBffError(inbox.error) ? inbox.error.correlationId : undefined}
            onRetry={() => load()}
          />
        </View>
      ) : firstLoad ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <FlatList
          data={inbox.items}
          keyExtractor={(item) => item.notificationId}
          renderItem={({ item }) => <NotificationListItem item={item} now={now} onPress={handlePress} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={inbox.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={inbox.status === 'refreshing'}
              onRefresh={inbox.refresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Bell}
              title={t('notifications.emptyTitle')}
              description={t('notifications.emptyDescription')}
            />
          }
          ListFooterComponent={
            inbox.status === 'loadingMore' ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  list: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: Spacing.three,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.three,
  },
  loader: {
    marginTop: Spacing.four,
  },
  footer: {
    marginVertical: Spacing.three,
  },
  bannerWrap: {
    padding: Spacing.three,
  },
});
