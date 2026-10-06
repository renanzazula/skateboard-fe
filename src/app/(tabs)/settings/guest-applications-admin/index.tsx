import { Redirect, router } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { GuestApplicationStatusBadge } from '@/features/guest-application/components/GuestApplicationStatusBadge';
import { useGuestApplicationsAdmin } from '@/features/guest-application/hooks/useGuestApplicationsAdmin';
import { GUEST_APPLICATION_STATUSES, type GuestApplication, type GuestApplicationStatus } from '@/features/guest-application/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type FilterValue = GuestApplicationStatus | 'ALL';
const FILTERS: FilterValue[] = ['ALL', ...GUEST_APPLICATION_STATUSES];

/** Settings → Administration → Guest Applications. Gated by FUNC_GUEST_APPLICATION_MANAGE. */
export default function GuestApplicationsAdminScreen() {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const { hasAuthority } = useAuth();
  const { listApplications } = useGuestApplicationsAdmin();

  const canManage = hasAuthority('FUNC_GUEST_APPLICATION_MANAGE');

  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [applications, setApplications] = useState<GuestApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApplications(await listApplications(filter === 'ALL' ? undefined : filter));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // listApplications is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) return <Redirect href="/settings" />;

  const renderContent = () => {
    if (loading) return <SkateLoader fullScreen />;
    if (error) return <ErrorBanner message={isBffError(error) ? error.message : t('admin.guestApplications.loadError')} onRetry={load} />;
    if (applications.length === 0) return <EmptyState icon={Inbox} title={t('admin.guestApplications.empty')} />;

    return (
      <ScrollView contentContainerStyle={styles.content}>
        {applications.map((application) => (
          <Pressable
            key={application.id}
            onPress={() => router.push(`/settings/guest-applications-admin/${application.id}`)}
            style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.rowMain}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {application.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                {application.email}
                {application.createdAt
                  ? ` · ${new Date(application.createdAt).toLocaleDateString(language)}`
                  : ''}
              </ThemedText>
            </View>
            {application.status ? <GuestApplicationStatusBadge status={application.status} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.guestApplications.title')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((value) => {
          const selected = value === filter;
          return (
            <Pressable key={value} onPress={() => setFilter(value)}>
              <ThemedView type={selected ? 'primarySoft' : 'surface'} style={styles.filterChip}>
                <ThemedText type="small" themeColor={selected ? 'primary' : 'textSecondary'}>
                  {value === 'ALL' ? t('admin.guestApplications.filterAll') : t(`admin.guestApplications.status_${value}`)}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>

      {renderContent()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.pill,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.three,
  },
  rowMain: { flex: 1, gap: 2 },
});
