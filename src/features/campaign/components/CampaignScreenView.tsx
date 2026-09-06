import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { Colors, RADII, Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { CampaignScreen, CampaignTextSize } from '@/features/campaign/types';

type Props = {
  screen: CampaignScreen;
  /** Fired when the user taps the CTA. */
  onCtaPress: () => void;
  /** Fired when the user taps the close button. */
  onClose: () => void;
};

const TEXT_SIZE_PX: Record<CampaignTextSize, number> = {
  SMALL: 16,
  MEDIUM: 22,
  LARGE: 30,
  EXTRA_LARGE: 40,
};

function alignSelf(alignment: CampaignScreen['textAlignment']): 'flex-start' | 'center' | 'flex-end' {
  if (alignment === 'LEFT') return 'flex-start';
  if (alignment === 'RIGHT') return 'flex-end';
  return 'center';
}

function textAlign(alignment: CampaignScreen['textAlignment']): 'left' | 'center' | 'right' {
  if (alignment === 'LEFT') return 'left';
  if (alignment === 'RIGHT') return 'right';
  return 'center';
}

/**
 * One FULL_BACKGROUND campaign screen (spec §7). The background image renders
 * `cover` with the admin-set focal point; a fallback colour shows behind it
 * while/if the image is unavailable. Text colour/size/alignment and overlay
 * opacity come from the screen config. The close button only appears after
 * `closeAfterSeconds` (default 1s when enabled).
 */
export function CampaignScreenView({ screen, onCtaPress, onClose }: Props) {
  const { t } = useTranslation();
  const [closeVisible, setCloseVisible] = useState(!screen.closeEnabled ? false : (screen.closeAfterSeconds ?? 1) <= 0);

  useEffect(() => {
    if (!screen.closeEnabled || closeVisible) return;
    const delayMs = (screen.closeAfterSeconds ?? 1) * 1000;
    const timer = setTimeout(() => setCloseVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [screen.closeEnabled, screen.closeAfterSeconds, closeVisible]);

  const overlayOpacity = screen.overlayOpacity ?? 0;
  const textColor = screen.textColor ?? Colors.textPrimary;
  const align = screen.textAlignment;

  return (
    <View style={[styles.root, { backgroundColor: screen.backgroundColor ?? Colors.background }]}>
      {screen.backgroundUrl ? (
        <Image
          source={{ uri: screen.backgroundUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{
            left: `${(screen.focalPointX ?? 0.5) * 100}%`,
            top: `${(screen.focalPointY ?? 0.5) * 100}%`,
          }}
          cachePolicy="memory-disk"
          transition={200}
        />
      ) : null}

      {overlayOpacity > 0 ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]} />
      ) : null}

      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          {closeVisible ? (
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('campaign.close')}
              style={styles.closeButton}>
              <ThemedText type="smallBold" style={styles.closeLabel}>
                ✕
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.content, { alignItems: alignSelf(align) }]}>
          {screen.title ? (
            <ThemedText
              style={[
                styles.title,
                { color: textColor, fontSize: TEXT_SIZE_PX[screen.titleSize], textAlign: textAlign(align) },
              ]}>
              {screen.title}
            </ThemedText>
          ) : null}
          {screen.description ? (
            <ThemedText
              style={[
                styles.description,
                { color: textColor, fontSize: TEXT_SIZE_PX[screen.descriptionSize], textAlign: textAlign(align) },
              ]}>
              {screen.description}
            </ThemedText>
          ) : null}

          {screen.actionType && screen.actionType !== 'NONE' ? (
            <View style={styles.cta}>
              <PrimaryButton title={screen.actionLabel || t('campaign.defaultCta')} onPress={onCtaPress} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  topRow: { height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: { color: Colors.textPrimary },
  content: { flex: 1, justifyContent: 'flex-end', paddingBottom: Spacing.six, gap: Spacing.three },
  title: { fontWeight: '700', lineHeight: undefined },
  description: { fontWeight: '500' },
  cta: { marginTop: Spacing.two, alignSelf: 'stretch' },
});
