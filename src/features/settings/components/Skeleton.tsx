import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  width: number;
  height?: number;
  style?: ViewStyle;
};

/** Pulsing placeholder for async trailing values (Clear cache size, Storage usage). Static when reduced motion is on. */
export function Skeleton({ width, height = 13, style }: Props) {
  const theme = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
    // opacity is a stable Reanimated shared value ref — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0.6 : opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, backgroundColor: theme.surfaceElevated }, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
  },
});
