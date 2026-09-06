import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { CampaignForm } from '@/features/campaign/admin/components/CampaignForm';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { CampaignRequest } from '@/features/campaign/types';
import { showAlert } from '@/shared/utils/alert';

export default function NewCampaignScreen() {
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, createCampaign } = useCampaignAdmin();

  if (!hasAuthority('FUNC_CAMPAIGN_MANAGE')) return <Redirect href="/settings" />;

  const handleSubmit = async (body: CampaignRequest) => {
    try {
      const created = await createCampaign(body);
      router.replace(`/settings/campaigns/${created.id}`);
    } catch (err) {
      showAlert(
        t('admin.campaigns.saveError'),
        isBffError(err) ? err.message : t('common.tryAgain')
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.campaigns.newCampaign')} />
      <ScrollView contentContainerStyle={styles.content}>
        <CampaignForm submitting={submitting} onSubmit={handleSubmit} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
});
