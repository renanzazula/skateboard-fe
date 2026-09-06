import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { CampaignSequence } from '@/features/campaign/components/CampaignSequence';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { CampaignRuntime } from '@/features/campaign/types';

/**
 * Full preview (spec AC8) — plays the campaign's real screen sequence and
 * timing against the loaded draft, with analytics suppressed. Reuses the
 * runtime renderer rather than forking it.
 */
export default function CampaignPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { getCampaign } = useCampaignAdmin();

  const [runtime, setRuntime] = useState<CampaignRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const c = await getCampaign(id);
      setRuntime({
        id: c.id,
        priority: c.priority,
        frequencyType: c.frequencyType,
        maxDisplaysPerDay: c.maxDisplaysPerDay,
        screens: [...(c.screens ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // getCampaign is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (hasAuthority('FUNC_CAMPAIGN_READ')) load();
  }, [hasAuthority, load]);

  if (!hasAuthority('FUNC_CAMPAIGN_READ')) return <Redirect href="/settings" />;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.campaigns.preview')} />
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      </ThemedView>
    );
  }

  if (error || !runtime || (runtime.screens ?? []).length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.campaigns.preview')} />
        <ErrorBanner
          message={error && isBffError(error) ? error.message : t('admin.campaigns.validationScreens')}
          onRetry={load}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CampaignSequence campaign={runtime} preview onDone={() => router.back()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: Spacing.six },
});
