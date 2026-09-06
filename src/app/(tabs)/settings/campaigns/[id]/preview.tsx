import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { CampaignScreenInspector } from '@/features/campaign/admin/components/CampaignScreenInspector';
import { ChoiceChips } from '@/features/campaign/admin/components/ChoiceChips';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';
import { CampaignSequence } from '@/features/campaign/components/CampaignSequence';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { CampaignRuntime } from '@/features/campaign/types';

type Mode = 'inspect' | 'play';

/**
 * Preview — spec AC7 (Inspect: static crop / safe area / content) and AC8
 * (Play: the real screen sequence and timing, analytics suppressed). Play
 * reuses the runtime renderer rather than forking it.
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
  const [mode, setMode] = useState<Mode>('inspect');
  const [playing, setPlaying] = useState(false);

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

  const screens = runtime?.screens ?? [];
  if (error || !runtime || screens.length === 0) {
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

  if (mode === 'play' && playing) {
    return (
      <ThemedView style={styles.container}>
        <CampaignSequence campaign={runtime} preview onDone={() => setPlaying(false)} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.campaigns.preview')} />
      <ScrollView contentContainerStyle={styles.content}>
        <ChoiceChips
          label={t('admin.campaigns.preview')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'inspect', label: t('common.edit') },
            { value: 'play', label: t('admin.campaigns.preview') },
          ]}
        />
        {mode === 'inspect' ? (
          <CampaignScreenInspector screens={screens} />
        ) : (
          <View style={styles.playCta}>
            <ThemedText type="small" themeColor="textMuted">
              {t('admin.campaigns.previewHint')}
            </ThemedText>
            <PrimaryButton title={t('admin.campaigns.preview')} onPress={() => setPlaying(true)} />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: Spacing.six },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  playCta: { gap: Spacing.three },
});
