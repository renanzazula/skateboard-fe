import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { ThemedText } from '@/shared/components/themed-text';
import {
  SWAP_AT,
  atomMetrics,
  electronPoint,
  flashOpacity,
  nucleusBurst,
  orbitKick,
  orbitTiltDeg,
  shockwave,
  sparkPoint,
} from '@/shared/components/loader/geometry';
import {
  SCENES,
  orbitsXml,
  sceneXml,
  wheelShineXml,
  wheelXml,
} from '@/shared/components/loader/illustrations';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

// The app icon — mic on a skateboard — cropped to its centre for the nucleus.
const BRAND_IMAGE = require('@/assets/images/loader-brand.jpg');

const ORBITS = 3;
const SPARKS = 14;

/** One lap of an electron. */
const LAP_MS = 2200;
/** One slow turn of the whole atom. */
const ATOM_SPIN_MS = 14000;
/** How often the nucleus explodes into the next scene. */
export const CYCLE_MS = 2600;
/** How long one explosion lasts, start of swell to end of pop-in. */
export const BURST_MS = 900;
/** Wheel turns per lap — enough that they visibly roll rather than slide. */
const WHEEL_TURNS_PER_LAP = 3;
const PULSE_MS = 1300;
const ENTER_MS = 380;

type Props = {
  /** Width/height of the square loader. Defaults to 200 full-screen, 140 inline. */
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
 * Brand loading indicator, built like the React atom: a nucleus showing the
 * app icon and then the app's four worlds (skate, Barcelona, the podcast,
 * places), drawn in the logo's black/yellow/white sticker style, with
 * three skateboard wheels rolling round it on tilted orbits, passing in
 * front of and behind it. Every few seconds the nucleus explodes — sparks,
 * shockwave, the orbits blown outwards — and re-forms as the next world.
 * Fades in rather than popping; holds still on the app icon when the OS
 * "reduce motion" setting is on.
 */
export function SkateLoader({ size, label, fullScreen = false, style, testID = 'skate-loader' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);

  const lap = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(1);
  const pulse = useSharedValue(0);
  const enter = useSharedValue(0);

  const px = size ?? (fullScreen ? 200 : 140);
  const m = atomMetrics(px);

  const art = useMemo(
    () => ({
      orbits: orbitsXml(theme, ORBITS),
      wheel: wheelXml(theme),
      shine: wheelShineXml(theme),
      scenes: SCENES.map((scene) => (scene === 'brand' ? null : sceneXml(scene, theme))),
    }),
    [theme],
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
      burst.value = 1;
      return;
    }
    enter.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    lap.value = withRepeat(withTiming(1, { duration: LAP_MS, easing: Easing.linear }), -1, false);
    spin.value = withRepeat(withTiming(360, { duration: ATOM_SPIN_MS, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }), -1, true);

    // The explosion is driven from JS because it has to swap the image —
    // React state — at a precise point in the animation.
    const swaps: ReturnType<typeof setTimeout>[] = [];
    const cycle = setInterval(() => {
      burst.value = 0;
      burst.value = withTiming(1, { duration: BURST_MS, easing: Easing.linear });
      swaps.push(setTimeout(() => setSceneIndex((i) => (i + 1) % SCENES.length), BURST_MS * SWAP_AT));
    }, CYCLE_MS);

    return () => {
      clearInterval(cycle);
      swaps.forEach(clearTimeout);
      [lap, spin, pulse, burst].forEach((value) => cancelAnimation(value));
    };
    // Shared values are stable refs — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.85 + 0.15 * enter.value }],
  }));
  const orbitsStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: 1 + 0.18 * orbitKick(burst.value) }],
  }));
  const nucleusStyle = useAnimatedStyle(() => {
    const { scale, opacity } = nucleusBurst(burst.value);
    return { opacity, transform: [{ scale: scale * (1 + 0.035 * pulse.value) }] };
  });
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.4 * pulse.value + 0.5 * orbitKick(burst.value),
    transform: [{ scale: 1.05 + 0.12 * pulse.value + 0.4 * orbitKick(burst.value) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity(burst.value) }));
  const shockStyle = useAnimatedStyle(() => {
    const { scale, opacity } = shockwave(burst.value);
    return { opacity, transform: [{ scale }] };
  });

  const scene = SCENES[sceneIndex];
  const nucleusBox = { width: m.nucleus, height: m.nucleus, borderRadius: m.nucleus / 2 };

  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen, style]}
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('common.loading')}
      accessibilityState={{ busy: true }}>
      <Animated.View style={[styles.atom, { width: px, height: px }, enterStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.back, orbitsStyle]}>
          <SvgXml xml={art.orbits} width={px} height={px} />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.middle, nucleusBox, { backgroundColor: theme.primarySoft }, haloStyle]} />
        <Animated.View
          style={[styles.layer, styles.middle, nucleusBox, { borderWidth: 2, borderColor: theme.primary }, shockStyle]}
        />
        <Animated.View style={[styles.layer, styles.middle, nucleusStyle]} testID={`skate-loader-scene-${scene}`}>
          {art.scenes[sceneIndex] === null ? (
            <Image
              source={BRAND_IMAGE}
              resizeMode="cover"
              style={[nucleusBox, { borderWidth: Math.max(2, m.nucleus * 0.036), borderColor: theme.primary }]}
            />
          ) : (
            <SvgXml xml={art.scenes[sceneIndex]} width={m.nucleus} height={m.nucleus} />
          )}
        </Animated.View>
        <Animated.View
          style={[styles.layer, styles.middle, styles.passThrough, nucleusBox, { backgroundColor: theme.textPrimary }, flashStyle]}
        />

        {Array.from({ length: ORBITS }, (_, i) => (
          <Electron
            key={i}
            index={i}
            lap={lap}
            spin={spin}
            burst={burst}
            size={m.wheel}
            rx={m.orbitRx}
            ry={m.orbitRy}
            wheelXml={art.wheel}
            shineXml={art.shine}
          />
        ))}

        {Array.from({ length: SPARKS }, (_, i) => (
          <Spark
            key={i}
            index={i}
            burst={burst}
            size={m.spark}
            from={m.sparkFrom}
            reach={m.sparkReach}
            color={i % 3 === 0 ? theme.textPrimary : theme.primary}
          />
        ))}
      </Animated.View>

      {label ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

type ElectronProps = {
  index: number;
  lap: SharedValue<number>;
  spin: SharedValue<number>;
  burst: SharedValue<number>;
  size: number;
  rx: number;
  ry: number;
  wheelXml: string;
  shineXml: string;
};

/**
 * A skateboard wheel riding one orbit. It rolls (rotates with distance
 * travelled), grows and brightens on the near side of the lap, shrinks and
 * dims on the far side, and swaps in front of / behind the nucleus with it.
 */
function Electron({ index, lap, spin, burst, size, rx, ry, wheelXml, shineXml }: ElectronProps) {
  const orbitStyle = useAnimatedStyle(() => {
    const t = (lap.value + index / ORBITS) % 1;
    const kick = 1 + 0.18 * orbitKick(burst.value);
    const { x, y, depth } = electronPoint(t, rx * kick, ry * kick, orbitTiltDeg(index, ORBITS) + spin.value);
    return {
      zIndex: depth >= 0 ? 3 : 1,
      opacity: 0.65 + 0.35 * ((depth + 1) / 2),
      transform: [{ translateX: x }, { translateY: y }, { scale: 0.78 + 0.3 * ((depth + 1) / 2) }],
    };
  });
  const rollStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${((lap.value + index / ORBITS) % 1) * 360 * WHEEL_TURNS_PER_LAP}deg` }],
  }));

  return (
    <Animated.View style={[styles.layer, styles.middle, { width: size, height: size }, orbitStyle]} testID={`skate-loader-wheel-${index}`}>
      <Animated.View style={rollStyle}>
        <SvgXml xml={wheelXml} width={size} height={size} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
        <SvgXml xml={shineXml} width={size} height={size} />
      </View>
    </Animated.View>
  );
}

type SparkProps = {
  index: number;
  burst: SharedValue<number>;
  size: number;
  from: number;
  reach: number;
  color: string;
};

function Spark({ index, burst, size, from, reach, color }: SparkProps) {
  const sparkStyle = useAnimatedStyle(() => {
    const { x, y, opacity, scale } = sparkPoint(burst.value, index, SPARKS, reach, from);
    return { opacity, transform: [{ translateX: x }, { translateY: y }, { scale }] };
  });
  return (
    <Animated.View
      style={[
        styles.layer,
        styles.front,
        styles.passThrough,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color },
        styles.sparkGlow,
        sparkStyle,
      ]}
    />
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
  atom: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    zIndex: 0,
  },
  middle: {
    zIndex: 2,
  },
  front: {
    zIndex: 4,
  },
  passThrough: {
    pointerEvents: 'none',
  },
  sparkGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  label: {
    marginTop: Spacing.three,
  },
});
