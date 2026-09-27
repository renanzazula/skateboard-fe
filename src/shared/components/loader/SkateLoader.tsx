import { useEffect, useState, type ComponentType } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/shared/components/themed-text';
import { BarcelonaGlyph, DeckGlyph, MicGlyph, PinGlyph, WheelGlyph } from '@/shared/components/loader/icons';
import { loaderMetrics, orbitPositions } from '@/shared/components/loader/geometry';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

// Skate · Barcelona · Podcast · Places — clockwise from 12 o'clock.
const ORBIT_GLYPHS: ComponentType<{ size: number; color: string }>[] = [DeckGlyph, BarcelonaGlyph, MicGlyph, PinGlyph];

const WHEEL_SPIN_MS = 900;
const ORBIT_SPIN_MS = 6000;

type Props = {
  /** Width/height of the square loader. */
  size?: number;
  /** Optional caption under the loader; also used as the accessibility label. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Brand loading indicator: a skateboard wheel spinning at the centre, with the
 * app's four themes (skate deck, Barcelona, podcast mic, places pin) rolling
 * around it on an orbit. Static when the OS "reduce motion" setting is on.
 */
export function SkateLoader({ size = 96, label, style, testID = 'skate-loader' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState(false);
  const wheel = useSharedValue(0);
  const orbit = useSharedValue(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    wheel.value = withRepeat(withTiming(360, { duration: WHEEL_SPIN_MS, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(360, { duration: ORBIT_SPIN_MS, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(wheel);
      cancelAnimation(orbit);
    };
    // Shared values are stable refs — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheel.value}deg` }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value}deg` }] }));
  // Counter-rotate each badge so its glyph stays upright while it travels.
  const uprightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-orbit.value}deg` }] }));

  const m = loaderMetrics(size);
  const points = orbitPositions(ORBIT_GLYPHS.length, m.orbitRadius, size / 2);

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('common.loading')}
      accessibilityState={{ busy: true }}>
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.track,
            {
              top: m.badge / 2,
              left: m.badge / 2,
              width: m.orbitRadius * 2,
              height: m.orbitRadius * 2,
              borderRadius: m.orbitRadius,
              borderColor: theme.border,
            },
          ]}
        />

        <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]}>
          {ORBIT_GLYPHS.map((Glyph, i) => (
            <Animated.View
              key={i}
              style={[
                styles.badge,
                {
                  left: points[i].x - m.badge / 2,
                  top: points[i].y - m.badge / 2,
                  width: m.badge,
                  height: m.badge,
                  borderRadius: m.badge / 2,
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.primarySoft,
                },
                uprightStyle,
              ]}>
              <Glyph size={m.icon} color={theme.primary} />
            </Animated.View>
          ))}
        </Animated.View>

        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <View
            style={[
              styles.glow,
              { width: m.wheel * 1.3, height: m.wheel * 1.3, borderRadius: m.wheel, backgroundColor: theme.primarySoft },
            ]}
          />
          <Animated.View style={wheelStyle}>
            <WheelGlyph size={m.wheel} urethane={theme.primary} core={theme.background} bearing={theme.surfaceElevated} />
          </Animated.View>
        </View>
      </View>

      {label ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  label: {
    marginTop: Spacing.three,
  },
});
