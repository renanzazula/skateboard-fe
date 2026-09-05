import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, DisplayFontFamily } from '@/shared/constants/theme';

const DURATION = 650;

/** Fades the whole overlay out once the app underneath is ready. */
const exitKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  20: {
    opacity: 1,
  },
  70: {
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 0,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

/** Yellow glow bloom behind the wordmark — doc §16/§18 allow glow for splash/launch branding. */
const glowKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0.7 }],
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.exp),
  },
});

const wordmarkKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: 6 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }],
    easing: Easing.out(Easing.cubic),
  },
});

type Props = {
  /** True once auth/fonts/language have all resolved and the real screen underneath is safe to reveal. */
  ready: boolean;
};

export function AnimatedSplashOverlay({ ready }: Props) {
  // Separate from `ready`: the native splash can only be swapped for this
  // view once the view itself has actually laid out, regardless of how
  // quickly (or slowly) the app becomes ready — hiding it any earlier would
  // reopen the gap this component exists to close.
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (nativeSplashHidden && ready) {
      setAnimate(true);
    }
  }, [nativeSplashHidden, ready]);

  if (!visible) return null;

  const content = (
    <>
      <Animated.View entering={glowKeyframe.duration(DURATION)} style={styles.glow}>
        <LinearGradient colors={['rgba(255,212,0,0.45)', 'rgba(255,212,0,0)']} style={styles.glowFill} />
      </Animated.View>
      <Animated.View entering={wordmarkKeyframe.duration(DURATION).delay(150)}>
        <Text style={styles.wordmark}>SKATEBOARD</Text>
      </Animated.View>
    </>
  );

  return animate ? (
    <Animated.View
      entering={exitKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {content}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setNativeSplashHidden(true);
        });
      }}
      style={styles.splashOverlay}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    // Matches Colors.background in shared/constants/theme.ts — kept as a
    // literal here since this renders before anything else mounts.
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
  },
  glowFill: {
    flex: 1,
  },
  wordmark: {
    fontFamily: DisplayFontFamily,
    fontSize: 28,
    letterSpacing: 6,
    color: Colors.textPrimary,
  },
});
