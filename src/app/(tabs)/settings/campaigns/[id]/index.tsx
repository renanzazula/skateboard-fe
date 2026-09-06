import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { CampaignForm } from '@/features/campaign/admin/components/CampaignForm';
import { CampaignScreenForm } from '@/features/campaign/admin/components/CampaignScreenForm';
import { CampaignScreenList } from '@/features/campaign/admin/components/CampaignScreenList';
import { CampaignStatusBadge } from '@/features/campaign/admin/components/CampaignStatusBadge';
import { LifecycleActions } from '@/features/campaign/admin/components/LifecycleActions';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { Campaign, CampaignScreen, CampaignScreenRequest } from '@/features/campaign/types';
import { showAlert } from '@/shared/utils/alert';

async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

type Panel = { kind: 'campaign' } | { kind: 'screen'; screen?: CampaignScreen };

export default function CampaignEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const admin = useCampaignAdmin();

  const canRead = hasAuthority('FUNC_CAMPAIGN_READ');
  const canManage = hasAuthority('FUNC_CAMPAIGN_MANAGE');

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: 'campaign' });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setCampaign(await admin.getCampaign(id));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
    // admin.getCampaign is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (canRead) load();
  }, [canRead, load]);

  if (!canRead) return <Redirect href="/settings" />;

  const fail = (key: 'saveError' | 'publishError' | 'pauseError' | 'archiveError' | 'deleteError' | 'removeScreenError' | 'reorderError' | 'uploadImageError', err: unknown) =>
    showAlert(t(`admin.campaigns.${key}`), isBffError(err) ? err.message : t('common.tryAgain'));

  const saveCampaign = async (body: Parameters<typeof admin.updateCampaign>[1]) => {
    if (!id) return;
    try {
      setCampaign(await admin.updateCampaign(id, body));
      showAlert(t('common.success'), t('admin.campaigns.saved'));
    } catch (err) {
      fail('saveError', err);
    }
  };

  const runLifecycle = (action: 'publish' | 'pause' | 'archive') => async () => {
    if (!id) return;
    try {
      setCampaign(await admin.lifecycle(id, action));
    } catch (err) {
      fail(`${action}Error` as 'publishError', err);
    }
  };

  const deleteCampaign = () => {
    if (!campaign || !id) return;
    showAlert(t('admin.campaigns.deleteTitle'), t('admin.campaigns.deleteMessage', { name: campaign.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await admin.deleteCampaign(id);
            router.replace('/settings/campaigns');
          } catch (err) {
            fail('deleteError', err);
          }
        },
      },
    ]);
  };

  const submitScreen = async (body: CampaignScreenRequest) => {
    if (!id) return;
    try {
      const editing = panel.kind === 'screen' ? panel.screen : undefined;
      if (editing) {
        await admin.updateScreen(id, editing.id, body);
      } else {
        await admin.addScreen(id, body);
      }
      setCampaign(await admin.getCampaign(id));
      setPanel({ kind: 'campaign' });
    } catch (err) {
      fail('saveError', err);
    }
  };

  const removeScreen = (screen: CampaignScreen) => {
    if (!id) return;
    showAlert(t('admin.campaigns.removeScreen'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await admin.removeScreen(id, screen.id);
            setCampaign(await admin.getCampaign(id));
          } catch (err) {
            fail('removeScreenError', err);
          }
        },
      },
    ]);
  };

  const reorder = async (screenIds: string[]) => {
    if (!id) return;
    try {
      setCampaign(await admin.reorderScreens(id, screenIds));
    } catch (err) {
      fail('reorderError', err);
      load();
    }
  };

  const uploadImage = async (screen: CampaignScreen) => {
    if (!id) return;
    const asset = await pickImage();
    if (!asset) return;
    try {
      await admin.uploadScreenImage(id, screen.id, asset);
      setCampaign(await admin.getCampaign(id));
    } catch (err) {
      fail('uploadImageError', err);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.campaigns.title')} />
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      </ThemedView>
    );
  }

  if (error || !campaign) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.campaigns.title')} />
        <ErrorBanner
          message={error && isBffError(error) ? error.message : t('admin.campaigns.loadError')}
          onRetry={load}
        />
      </ThemedView>
    );
  }

  if (panel.kind === 'screen') {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={panel.screen ? t('common.edit') : t('admin.campaigns.addScreen')} />
        <ScrollView contentContainerStyle={styles.content}>
          {panel.screen ? (
            <SecondaryButton
              title={t('admin.campaigns.screenImage')}
              onPress={() => uploadImage(panel.screen!)}
              disabled={admin.submitting}
            />
          ) : (
            <ThemedText type="small" themeColor="textMuted">
              {t('admin.campaigns.screenImage')}: {t('admin.campaigns.addScreen')} → {t('common.save')}
            </ThemedText>
          )}
          <CampaignScreenForm
            initial={panel.screen}
            submitting={admin.submitting}
            submitLabel={t('common.save')}
            onSubmit={submitScreen}
          />
          <SecondaryButton title={t('common.cancel')} onPress={() => setPanel({ kind: 'campaign' })} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={campaign.name} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <CampaignStatusBadge status={campaign.status} />
          <SecondaryButton
            title={t('admin.campaigns.preview')}
            onPress={() => router.push(`/settings/campaigns/${campaign.id}/preview`)}
          />
        </View>

        <CampaignForm initial={campaign} submitting={admin.submitting} onSubmit={saveCampaign} />

        <CampaignScreenList
          campaign={campaign}
          busy={admin.submitting}
          canManage={canManage}
          onAdd={() => setPanel({ kind: 'screen' })}
          onEdit={(screen) => setPanel({ kind: 'screen', screen })}
          onRemove={removeScreen}
          onReorder={reorder}
        />

        <LifecycleActions
          campaign={campaign}
          busy={admin.submitting}
          onPublish={runLifecycle('publish')}
          onPause={runLifecycle('pause')}
          onArchive={runLifecycle('archive')}
          onDelete={deleteCampaign}
        />

        {canManage ? null : (
          <ThemedText type="small" themeColor="textMuted">
            {t('admin.campaigns.title')}
          </ThemedText>
        )}
        <View style={styles.spacer} />
        <PrimaryButton title={t('common.close')} onPress={() => router.back()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: Spacing.six },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  spacer: { height: Spacing.two },
});
