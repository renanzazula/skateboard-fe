import { StyleSheet, Text } from 'react-native';

import { Colors, RADII } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { CampaignStatus } from '@/features/campaign/types';

const TONE: Record<CampaignStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: Colors.chipBg, fg: Colors.textSecondary },
  SCHEDULED: { bg: 'rgba(245,197,24,0.18)', fg: Colors.primary },
  ACTIVE: { bg: 'rgba(50,215,75,0.18)', fg: Colors.success },
  PAUSED: { bg: 'rgba(245,197,24,0.18)', fg: Colors.warning },
  EXPIRED: { bg: Colors.chipBg, fg: Colors.textMuted },
  ARCHIVED: { bg: Colors.chipBg, fg: Colors.textMuted },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const { t } = useTranslation();
  const tone = TONE[status] ?? TONE.DRAFT;
  return (
    <Text style={[styles.badge, { backgroundColor: tone.bg, color: tone.fg }]}>
      {t(`admin.campaigns.status_${status}` as 'admin.campaigns.status_DRAFT')}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
});
