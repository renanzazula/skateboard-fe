import { Image } from 'expo-image';
import { useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  clamp,
  clampPan,
  containSize,
  coverBaseScale,
  fixedRatioCropRect,
  freeFormCropRect,
  updateFreeFormCorner,
  type Corner,
  type CropRect,
} from '@/shared/components/image-upload/cropMath';
import { useTheme } from '@/shared/hooks/use-theme';

const MAX_ZOOM = 4;
const HANDLE_SIZE = 28;
const HANDLE_HIT_SLOP = 12;

export type ImageCropperHandle = { getCropRect: () => CropRect };

type Props = {
  ref?: React.Ref<ImageCropperHandle>;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  /** Number locks the crop frame to that ratio (pan/zoom the image underneath it); 'free' gives a resizable frame. */
  aspectRatio: number | 'free';
  containerWidth: number;
  containerHeight: number;
};

export function ImageCropper({
  ref,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  containerWidth,
  containerHeight,
}: Props) {
  if (aspectRatio === 'free') {
    return (
      <FreeFormCropper
        ref={ref}
        imageUri={imageUri}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
      />
    );
  }
  return (
    <FixedRatioCropper
      ref={ref}
      imageUri={imageUri}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      aspectRatio={aspectRatio}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
    />
  );
}

// ── Fixed-ratio: pan/pinch the image underneath a fixed viewport ───────────

type FixedRatioProps = {
  ref?: React.Ref<ImageCropperHandle>;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number;
  containerWidth: number;
  containerHeight: number;
};

function FixedRatioCropper({
  ref,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  containerWidth,
  containerHeight,
}: FixedRatioProps) {
  const theme = useTheme();

  let viewportW = containerWidth;
  let viewportH = viewportW / aspectRatio;
  if (viewportH > containerHeight) {
    viewportH = containerHeight;
    viewportW = viewportH * aspectRatio;
  }

  const baseScale = coverBaseScale(viewportW, viewportH, imageWidth, imageHeight);
  const displayW = imageWidth * baseScale;
  const displayH = imageHeight * baseScale;

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    getCropRect: () =>
      fixedRatioCropRect({
        viewportW,
        viewportH,
        imgW: imageWidth,
        imgH: imageHeight,
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
      }),
  }));

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const totalScale = baseScale * scale.value;
      const next = clampPan(
        startX.value + e.translationX,
        startY.value + e.translationY,
        viewportW,
        viewportH,
        imageWidth,
        imageHeight,
        totalScale
      );
      translateX.value = next.x;
      translateY.value = next.y;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const nextScale = clamp(startScale.value * e.scale, 1, MAX_ZOOM);
      scale.value = nextScale;
      const totalScale = baseScale * nextScale;
      const next = clampPan(translateX.value, translateY.value, viewportW, viewportH, imageWidth, imageHeight, totalScale);
      translateX.value = next.x;
      translateY.value = next.y;
    });

  const composedGesture = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    width: displayW,
    height: displayH,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View style={[styles.viewportWrap, { width: viewportW, height: viewportH, borderColor: theme.primary }]}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.clip}>
          <Animated.View style={animatedStyle}>
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="fill" />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

// ── Free-form: image at a fixed size, drag the frame's corners to crop ─────

type FreeFormProps = {
  ref?: React.Ref<ImageCropperHandle>;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
};

function FreeFormCropper({ ref, imageUri, imageWidth, imageHeight, containerWidth, containerHeight }: FreeFormProps) {
  const theme = useTheme();
  const { width: displayW, height: displayH, scale: displayScale } = containSize(
    containerWidth,
    containerHeight,
    imageWidth,
    imageHeight
  );

  const frameX = useSharedValue(0);
  const frameY = useSharedValue(0);
  const frameW = useSharedValue(displayW);
  const frameH = useSharedValue(displayH);

  useImperativeHandle(ref, () => ({
    getCropRect: () =>
      freeFormCropRect({
        displayScale,
        imgW: imageWidth,
        imgH: imageHeight,
        frameX: frameX.value,
        frameY: frameY.value,
        frameW: frameW.value,
        frameH: frameH.value,
      }),
  }));

  const frameStyle = useAnimatedStyle(() => ({
    left: frameX.value,
    top: frameY.value,
    width: frameW.value,
    height: frameH.value,
  }));

  const corners: Corner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

  return (
    <View style={{ width: displayW, height: displayH }}>
      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={[StyleSheet.absoluteFill, styles.freeFormDim]} />
      <Animated.View style={[styles.freeFormFrame, { borderColor: theme.primary }, frameStyle]} />
      {corners.map((corner) => (
        <CornerHandle
          key={corner}
          corner={corner}
          frameX={frameX}
          frameY={frameY}
          frameW={frameW}
          frameH={frameH}
          displayW={displayW}
          displayH={displayH}
          color={theme.primary}
          borderColor={theme.onPrimary}
        />
      ))}
    </View>
  );
}

type SharedNumber = ReturnType<typeof useSharedValue<number>>;

/** One draggable corner of the free-form crop frame — its own component so useAnimatedStyle/Gesture.Pan are called unconditionally per instance, not inside the parent's .map(). */
function CornerHandle({
  corner,
  frameX,
  frameY,
  frameW,
  frameH,
  displayW,
  displayH,
  color,
  borderColor,
}: {
  corner: Corner;
  frameX: SharedNumber;
  frameY: SharedNumber;
  frameW: SharedNumber;
  frameH: SharedNumber;
  displayW: number;
  displayH: number;
  color: string;
  borderColor: string;
}) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startW = useSharedValue(0);
  const startH = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      startX.value = frameX.value;
      startY.value = frameY.value;
      startW.value = frameW.value;
      startH.value = frameH.value;
    })
    .onUpdate((e) => {
      const next = updateFreeFormCorner(
        corner,
        e.translationX,
        e.translationY,
        { x: startX.value, y: startY.value, w: startW.value, h: startH.value },
        displayW,
        displayH
      );
      frameX.value = next.x;
      frameY.value = next.y;
      frameW.value = next.w;
      frameH.value = next.h;
    });

  const style = useAnimatedStyle(() => {
    const isLeft = corner === 'topLeft' || corner === 'bottomLeft';
    const isTop = corner === 'topLeft' || corner === 'topRight';
    return {
      left: (isLeft ? frameX.value : frameX.value + frameW.value) - HANDLE_SIZE / 2,
      top: (isTop ? frameY.value : frameY.value + frameH.value) - HANDLE_SIZE / 2,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View hitSlop={HANDLE_HIT_SLOP} style={[styles.handle, { backgroundColor: color, borderColor }, style]} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  viewportWrap: {
    borderWidth: 2,
    alignSelf: 'center',
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeFormDim: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  freeFormFrame: {
    position: 'absolute',
    borderWidth: 2,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 2,
  },
});
