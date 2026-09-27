import { useEffect, useMemo, useRef, useState } from 'react';
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
  divePose,
  electronPoint,
  flashOpacity,
  nucleusBurst,
  orbitKick,
  orbitTiltDeg,
  shockwave,
  sparkPoint,
  splashFrame,
} from '@/shared/components/loader/geometry';
import {
  NUCLEUS_HUB,
  ORBIT_OBJECTS,
  SCENES,
  badgeXml,
  nucleusShineXml,
  nucleusWheelXml,
  orbitsXml,
  sceneXml,
  splashXml,
} from '@/shared/components/loader/illustrations';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

// The app icon — mic on a skateboard — cropped to its centre for the hub.
const BRAND_IMAGE = require('@/assets/images/loader-brand.jpg');

const ORBITS = ORBIT_OBJECTS.length;
const SPARKS = 14;

/** One turn of the nucleus tyre. */
const TYRE_TURN_MS = 1600;
/** One lap of an orbiting object. */
const LAP_MS = 3200;
/** One slow turn of the whole atom. */
const ATOM_SPIN_MS = 14000;
/** How often the hub changes image. */
export const CYCLE_MS = 2600;
/** How long an object takes to dive from its orbit into the hub. */
export const DIVE_MS = 650;
/** How long one splash explosion lasts. */
export const BURST_MS = 900;
/** How long the previous hub object takes to fly back out to its orbit. */
const RETURN_MS = 800;
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
 * Brand loading indicator, built like the React atom, in the logo's
 * black/yellow/white sticker style.
 *
 * The nucleus is a big skateboard wheel, its tyre rolling non-stop, with an
 * image in its hub — the app icon to start with. Riding three tilted orbits
 * round it are Barcelona (the Sagrada Família), the podcast mic and a
 * places pin, passing in front of and behind the wheel.
 *
 * Every cycle the next object leaves its orbit and dives into the wheel,
 * landing in a paint-splash explosion; under the splash the hub becomes that
 * object, and whichever object was in the hub flies back out to its orbit.
 * Then the icon again, and round. Fades in rather than popping; holds still
 * on the app icon when the OS "reduce motion" setting is on.
 */
export function SkateLoader({ size, label, fullScreen = false, style, testID = 'skate-loader' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const sceneRef = useRef(0);

  const lap = useSharedValue(0);
  const tyre = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(1);
  const pulse = useSharedValue(0);
  const enter = useSharedValue(0);
  // One per orbit object: 0 = riding its orbit, 1 = merged into the hub.
  const dive0 = useSharedValue(0);
  const dive1 = useSharedValue(0);
  const dive2 = useSharedValue(0);
  const dives = [dive0, dive1, dive2];

  const px = size ?? (fullScreen ? 200 : 140);
  const m = atomMetrics(px);
  const hub = Math.round(m.nucleus * NUCLEUS_HUB);

  const art = useMemo(
    () => ({
      orbits: orbitsXml(theme, ORBITS),
      tyre: nucleusWheelXml(theme),
      tyreShine: nucleusShineXml(theme),
      splash: splashXml(theme),
      scenes: SCENES.map((scene) => (scene === 'brand' ? null : sceneXml(scene, theme))),
      badges: ORBIT_OBJECTS.map((scene) => badgeXml(scene, theme)),
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
    tyre.value = withRepeat(withTiming(360, { duration: TYRE_TURN_MS, easing: Easing.linear }), -1, false);
    lap.value = withRepeat(withTiming(1, { duration: LAP_MS, easing: Easing.linear }), -1, false);
    spin.value = withRepeat(withTiming(360, { duration: ATOM_SPIN_MS, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }), -1, true);

    // The choreography is driven from JS because it swaps the hub image —
    // React state — at a precise point, under the splash.
    const pending = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const timer = setTimeout(() => {
        pending.delete(timer);
        fn();
      }, ms);
      pending.add(timer);
    };

    const cycle = setInterval(() => {
      const from = sceneRef.current;
      const to = (from + 1) % SCENES.length;
      const incoming = ORBIT_OBJECTS.indexOf(SCENES[to] as (typeof ORBIT_OBJECTS)[number]);
      const outgoing = ORBIT_OBJECTS.indexOf(SCENES[from] as (typeof ORBIT_OBJECTS)[number]);

      // 1. the next object dives in (the icon has no orbit, so it just bursts)
      if (incoming >= 0) dives[incoming].value = withTiming(1, { duration: DIVE_MS, easing: Easing.linear });
      later(
        () => {
          // 2. it lands: splash explosion
          burst.value = 0;
          burst.value = withTiming(1, { duration: BURST_MS, easing: Easing.linear });
          later(() => {
            // 3. under full splash cover: swap the hub, send the old object home
            sceneRef.current = to;
            setSceneIndex(to);
            if (outgoing >= 0) dives[outgoing].value = withTiming(0, { duration: RETURN_MS, easing: Easing.linear });
          }, BURST_MS * SWAP_AT);
        },
        incoming >= 0 ? DIVE_MS : 0,
      );
    }, CYCLE_MS);

    return () => {
      clearInterval(cycle);
      pending.forEach(clearTimeout);
      [lap, tyre, spin, pulse, burst, ...dives].forEach((value) => cancelAnimation(value));
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
  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: (1 + 0.1 * orbitKick(burst.value)) * (1 + 0.03 * pulse.value) }],
  }));
  const hubStyle = useAnimatedStyle(() => {
    const { scale, opacity } = nucleusBurst(burst.value);
    return { opacity, transform: [{ scale }] };
  });
  const tyreStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tyre.value}deg` }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.4 * pulse.value + 0.5 * orbitKick(burst.value),
    transform: [{ scale: 1.05 + 0.12 * pulse.value + 0.4 * orbitKick(burst.value) }],
  }));
  const shockStyle = useAnimatedStyle(() => {
    const { scale, opacity } = shockwave(burst.value);
    return { opacity, transform: [{ scale }] };
  });
  const splashStyle = useAnimatedStyle(() => {
    const { scale, opacity, rotate } = splashFrame(burst.value);
    return { opacity, transform: [{ rotate: `${rotate}deg` }, { scale }] };
  });
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity(burst.value) }));

  const scene = SCENES[sceneIndex];
  const nucleusBox = { width: m.nucleus, height: m.nucleus, borderRadius: m.nucleus / 2 };
  const hubBox = { width: hub, height: hub, borderRadius: hub / 2 };

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

        {/* The spinning wheel: the hub image, the tyre rolling round it,
            and the light on the tyre, which stays put. */}
        <Animated.View style={[styles.layer, styles.middle, nucleusBox, wheelStyle]}>
          <Animated.View
            style={[styles.layer, hubBox, styles.hub, { backgroundColor: theme.background }, hubStyle]}
            testID={`skate-loader-scene-${scene}`}>
            {art.scenes[sceneIndex] === null ? (
              <Image source={BRAND_IMAGE} resizeMode="cover" style={hubBox} />
            ) : (
              <SvgXml xml={art.scenes[sceneIndex]} width={hub} height={hub} />
            )}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, tyreStyle]} testID="skate-loader-tyre">
            <SvgXml xml={art.tyre} width={m.nucleus} height={m.nucleus} />
          </Animated.View>
          <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
            <SvgXml xml={art.tyreShine} width={m.nucleus} height={m.nucleus} />
          </View>
        </Animated.View>

        {ORBIT_OBJECTS.map((object, i) => (
          <OrbitObject
            key={object}
            testID={`skate-loader-orbit-${object}`}
            index={i}
            lap={lap}
            spin={spin}
            burst={burst}
            dive={dives[i]}
            size={m.badge}
            hubScale={hub / m.badge}
            rx={m.orbitRx}
            ry={m.orbitRy}
            xml={art.badges[i]}
          />
        ))}

        <Animated.View
          style={[styles.layer, styles.top, styles.passThrough, { width: m.splash, height: m.splash }, splashStyle]}
          testID="skate-loader-splash">
          <SvgXml xml={art.splash} width={m.splash} height={m.splash} />
        </Animated.View>
        <Animated.View
          style={[styles.layer, styles.top, styles.passThrough, hubBox, { backgroundColor: theme.textPrimary }, flashStyle]}
        />
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

type OrbitObjectProps = {
  testID: string;
  index: number;
  lap: SharedValue<number>;
  spin: SharedValue<number>;
  burst: SharedValue<number>;
  dive: SharedValue<number>;
  size: number;
  hubScale: number;
  rx: number;
  ry: number;
  xml: string;
};

/**
 * One of the orbiting objects. On its orbit it grows and brightens on the
 * near side of the lap and slips behind the wheel on the far side; when
 * it's its turn it dives into the hub (see `divePose`) and later flies back
 * out to where its orbit has got to.
 */
function OrbitObject({ testID, index, lap, spin, burst, dive, size, hubScale, rx, ry, xml }: OrbitObjectProps) {
  const poseStyle = useAnimatedStyle(() => {
    const t = (lap.value + index / ORBITS) % 1;
    const kick = 1 + 0.18 * orbitKick(burst.value);
    const orbit = electronPoint(t, rx * kick, ry * kick, orbitTiltDeg(index, ORBITS) + spin.value);
    const { x, y, scale, opacity, zIndex } = divePose(orbit, dive.value, hubScale);
    return { zIndex, opacity, transform: [{ translateX: x }, { translateY: y }, { scale }] };
  });

  return (
    <Animated.View style={[styles.layer, styles.middle, { width: size, height: size }, poseStyle]} testID={testID}>
      <SvgXml xml={xml} width={size} height={size} />
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
        styles.top,
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
  hub: {
    overflow: 'hidden',
  },
  back: {
    zIndex: 0,
  },
  middle: {
    zIndex: 2,
  },
  top: {
    zIndex: 6,
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
