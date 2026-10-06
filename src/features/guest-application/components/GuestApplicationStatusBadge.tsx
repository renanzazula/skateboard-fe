import { StyleSheet, Text } from 'react-native';

import { Colors, RADII } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { GuestApplicationStatus } from '@/features/guest-application/types';

const TONE: Record<GuestApplicationStatus, { bg: string; fg: string }> = {
  NEW: { bg: 'rgba(245,197,24,0.18)', fg: Colors.primary },
  CONTACTED: { bg: 'rgba(245,197,24,0.18)', fg: Colors.warning },
  ACCEPTED: { bg: 'rgba(50,215,75,0.18)', fg: Colors.success },
  DECLINED: { bg: Colors.chipBg, fg: Colors.textMuted },
};

export function GuestApplicationStatusBadge({ status }: Readonly<{ status: GuestApplicationStatus }>) {
  const { t } = useTranslation();
  const tone = TONE[status] ?? TONE.NEW;
  return (
    <Text style={[styles.badge, { backgroundColor: tone.bg, color: tone.fg }]}>
      {t(`admin.guestApplications.status_${status}` as 'admin.guestApplications.status_NEW')}
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
