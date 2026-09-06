import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/components/themed-text';
import { Colors, RADII, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { ChoiceChips } from '@/features/campaign/admin/components/ChoiceChips';
import type { CampaignScreen } from '@/features/campaign/types';

/**
 * Static preview (spec AC7) — shows a screen's image crop with the safe area
 * and focal point marked, and the text content in place, so an admin can
 * check framing before publishing. A phone-shaped frame with the device's own
 * insets applied; not the full-timing playback (that's the Play tab).
 */
export function CampaignScreenInspector({ screens }: { screens: CampaignScreen[] }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const screen = screens[index];
  if (!screen) return null;

  const frameWidth = Math.min(width - Spacing.four * 2, 320);
  const frameHeight = frameWidth * (16 / 9);
  const scale = frameHeight / (frameHeight + insets.top + insets.bottom);

  const pct = (n: number): `${number}%` => `${n}%`;
  const focalLeft = pct((screen.focalPointX ?? 0.5) * 100);
  const focalTop = pct((screen.focalPointY ?? 0.5) * 100);

  return (
    <View style={styles.wrap}>
      {screens.length > 1 ? (
        <ChoiceChips
          label={t('admin.campaigns.screens')}
          value={String(index)}
          onChange={(v) => setIndex(Number(v))}
          options={screens.map((s, i) => ({ value: String(i), label: `#${s.position ?? i + 1}` }))}
        />
      ) : null}

      <View style={[styles.frame, { width: frameWidth, height: frameHeight, borderColor: Colors.border }]}>
        {screen.backgroundUrl ? (
          <Image
            source={{ uri: screen.backgroundUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ left: focalLeft, top: focalTop }}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: screen.backgroundColor ?? Colors.background }]} />
        )}

        {screen.overlayOpacity ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${screen.overlayOpacity})` }]} />
        ) : null}

        {/* Safe-area rectangle — dashed inset by the device insets, scaled to the frame. */}
        <View
          pointerEvents="none"
          style={[
            styles.safeArea,
            {
              top: insets.top * scale,
              bottom: insets.bottom * scale,
              left: Spacing.four,
              right: Spacing.four,
            },
          ]}
        />

        {/* Focal-point crosshair. */}
        <View pointerEvents="none" style={[styles.focal, { left: focalLeft, top: focalTop }]}>
          <View style={styles.focalDot} />
        </View>

        {/* Content, bottom-aligned like the real renderer. */}
        <View style={styles.content} pointerEvents="none">
          {screen.title ? (
            <ThemedText style={[styles.title, { color: screen.textColor ?? Colors.textPrimary }]} numberOfLines={2}>
              {screen.title}
            </ThemedText>
          ) : null}
          {screen.description ? (
            <ThemedText style={[styles.desc, { color: screen.textColor ?? Colors.textPrimary }]} numberOfLines={3}>
              {screen.description}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <ThemedText type="small" themeColor="textMuted">
        {t('admin.campaigns.duration')}: {screen.durationSeconds}s ·{' '}
        {t('admin.campaigns.actionType')}: {screen.actionType}
        {screen.actionTarget ? ` → ${screen.actionTarget}` : ''}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.three },
  frame: { borderWidth: 1, borderRadius: RADII.card, overflow: 'hidden' },
  safeArea: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.7)',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  focal: { position: 'absolute', width: 0, height: 0 },
  focalDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(245,197,24,0.35)',
  },
  content: { position: 'absolute', left: Spacing.three, right: Spacing.three, bottom: Spacing.four, gap: Spacing.one },
  title: { fontSize: 20, fontWeight: '700' },
  desc: { fontSize: 13, fontWeight: '500' },
});
