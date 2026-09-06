import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { Campaign, CampaignScreen } from '@/features/campaign/types';

type Props = {
  campaign: Campaign;
  busy: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (screen: CampaignScreen) => void;
  onRemove: (screen: CampaignScreen) => void;
  onReorder: (screenIds: string[]) => void;
};

const MAX_SCREENS = 3;

export function CampaignScreenList({ campaign, busy, canManage, onAdd, onEdit, onRemove, onReorder }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const screens = [...(campaign.screens ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const totalDuration = screens.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...screens];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map((s) => s.id));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText type="smallBold">{t('admin.campaigns.screens')}</ThemedText>
        <ThemedText type="small" themeColor={totalDuration > 10 ? 'destructive' : 'textMuted'}>
          {screens.length}/{MAX_SCREENS} · {totalDuration}s
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textMuted">
        {t('admin.campaigns.screensHint')}
      </ThemedText>

      {screens.map((screen, index) => (
        <View key={screen.id} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          {screen.backgroundUrl ? (
            <Image source={{ uri: screen.backgroundUrl }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: screen.backgroundColor ?? theme.chipBg }]} />
          )}
          <Pressable style={styles.rowBody} onPress={() => onEdit(screen)} disabled={busy}>
            <ThemedText type="small" numberOfLines={1}>
              {screen.title || `#${screen.position}`}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {screen.durationSeconds}s · {screen.actionType}
            </ThemedText>
          </Pressable>
          {canManage ? (
            <View style={styles.rowActions}>
              <Pressable onPress={() => move(index, -1)} disabled={busy || index === 0} hitSlop={8}>
                <ThemedText type="smallBold" themeColor={index === 0 ? 'textDisabled' : 'textPrimary'}>
                  ↑
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => move(index, 1)} disabled={busy || index === screens.length - 1} hitSlop={8}>
                <ThemedText type="smallBold" themeColor={index === screens.length - 1 ? 'textDisabled' : 'textPrimary'}>
                  ↓
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => onRemove(screen)} disabled={busy} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="destructive">
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      {canManage && screens.length < MAX_SCREENS ? (
        <SecondaryButton title={t('admin.campaigns.addScreen')} onPress={onAdd} disabled={busy} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, marginTop: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.two,
  },
  thumb: { width: 44, height: 44, borderRadius: RADII.control },
  rowBody: { flex: 1, gap: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.one },
});
