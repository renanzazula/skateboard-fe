import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { ThemedText } from '@/shared/components/themed-text';
import { loaderMetrics, orbitPositions } from '@/shared/components/loader/geometry';
import {
  orbitIllustrationXml,
  wheelShineXml,
  wheelXml,
  type IllustrationPalette,
  type OrbitIllustration,
} from '@/shared/components/loader/illustrations';
import { IllustrationColors, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

// Skate · Barcelona · Podcast · Places — clockwise from 12 o'clock.
const ORBIT: OrbitIllustration[] = ['deck', 'barcelona', 'mic', 'pin'];

const WHEEL_SPIN_MS = 900;
const ORBIT_SPIN_MS = 6000;
const GLOW_PULSE_MS = 1400;
const ENTER_MS = 380;

type Props = {
  /** Width/height of the square loader. */
  size?: number;
  /** Optional caption under the loader; also used as the accessibility label. */
  label?: string;
  /**
   * Covers the nearest screen container and sits dead centre of it — for a
   * page's initial load. Touches pass through, so a header's back button
   * stays usable while it spins.
   */
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Brand loading indicator: an illustrated skateboard wheel spinning at the
 * centre (the light on it stays put, so it reads as a real object turning),
 * with the app's four worlds — a maple deck, the Sagrada Família, a studio
 * mic and a map pin — riding an orbit around it. Fades in rather than
 * popping; static when the OS "reduce motion" setting is on.
 */
export function SkateLoader({ size = 120, label, fullScreen = false, style, testID = 'skate-loader' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState(false);
  const wheel = useSharedValue(0);
  const orbit = useSharedValue(0);
  const glow = useSharedValue(0);
  const enter = useSharedValue(0);

  const palette: IllustrationPalette = useMemo(() => ({ ...theme, ...IllustrationColors }), [theme]);
  const art = useMemo(
    () => ({
      wheel: wheelXml(palette),
      shine: wheelShineXml(palette),
      orbit: ORBIT.map((kind) => orbitIllustrationXml(kind, palette)),
    }),
    [palette],
  );

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
    if (reduceMotion) {
      enter.value = 1;
      return;
    }
    enter.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    wheel.value = withRepeat(withTiming(360, { duration: WHEEL_SPIN_MS, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(360, { duration: ORBIT_SPIN_MS, easing: Easing.linear }), -1, false);
    glow.value = withRepeat(withTiming(1, { duration: GLOW_PULSE_MS, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => {
      cancelAnimation(wheel);
      cancelAnimation(orbit);
      cancelAnimation(glow);
    };
    // Shared values are stable refs — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.85 + 0.15 * enter.value }],
  }));
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheel.value}deg` }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value}deg` }] }));
  // Counter-rotate each badge so its artwork stays upright while it travels.
  const uprightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-orbit.value}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * glow.value,
    transform: [{ scale: 0.92 + 0.12 * glow.value }],
  }));

  const m = loaderMetrics(size);
  const points = orbitPositions(ORBIT.length, m.orbitRadius, size / 2);
  const glowSize = m.wheel * 1.45;

  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen, style]}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('common.loading')}
      accessibilityState={{ busy: true }}>
      <Animated.View style={[{ width: size, height: size }, enterStyle]}>
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

        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Animated.View
            style={[
              styles.layer,
              { width: glowSize, height: glowSize, borderRadius: glowSize / 2, backgroundColor: theme.primarySoft },
              glowStyle,
            ]}
          />
          <Animated.View style={[styles.layer, wheelStyle]}>
            <SvgXml xml={art.wheel} width={m.wheel} height={m.wheel} />
          </Animated.View>
          <View style={[styles.layer, styles.passThrough]}>
            <SvgXml xml={art.shine} width={m.wheel} height={m.wheel} />
          </View>
        </View>

        <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]}>
          {art.orbit.map((xml, i) => (
            <Animated.View
              key={ORBIT[i]}
              testID={`skate-loader-${ORBIT[i]}`}
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
                  shadowColor: theme.shadow,
                },
                uprightStyle,
              ]}>
              <SvgXml xml={xml} width={m.icon} height={m.icon} />
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>

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
  fullScreen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  passThrough: {
    pointerEvents: 'none',
  },
  track: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    marginTop: Spacing.three,
  },
});
