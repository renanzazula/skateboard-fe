import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { Campaign } from '@/features/campaign/types';

type Props = {
  campaign: Campaign;
  busy: boolean;
  onPublish: () => void;
  onPause: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

/**
 * Publish / Pause / Archive / Delete — shown per the campaign's status and the
 * caller's permissions. Delete is only offered while DRAFT (the backend 409s
 * otherwise); anything that has left DRAFT is archived instead.
 */
export function LifecycleActions({ campaign, busy, onPublish, onPause, onArchive, onDelete }: Props) {
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();

  const canManage = hasAuthority('FUNC_CAMPAIGN_MANAGE');
  const canPublish = hasAuthority('FUNC_CAMPAIGN_PUBLISH');
  const status = campaign.status;

  const showPublish = canPublish && (status === 'DRAFT' || status === 'PAUSED');
  const showPause = canPublish && (status === 'SCHEDULED' || status === 'ACTIVE');
  const showArchive = canPublish && status !== 'ARCHIVED' && status !== 'DRAFT';
  const showDelete = canManage && status === 'DRAFT';

  if (!showPublish && !showPause && !showArchive && !showDelete) return null;

  return (
    <View style={styles.actions}>
      {showPublish ? <SecondaryButton title={t('admin.campaigns.publish')} onPress={onPublish} disabled={busy} /> : null}
      {showPause ? <SecondaryButton title={t('admin.campaigns.pause')} onPress={onPause} disabled={busy} /> : null}
      {showArchive ? <SecondaryButton title={t('admin.campaigns.archive')} onPress={onArchive} disabled={busy} /> : null}
      {showDelete ? <SecondaryButton title={t('common.delete')} onPress={onDelete} disabled={busy} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.two, marginTop: Spacing.three },
});
