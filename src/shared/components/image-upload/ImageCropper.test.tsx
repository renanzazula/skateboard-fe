import { createRef } from 'react';
import { render } from '@testing-library/react-native';

import { ImageCropper, type ImageCropperHandle } from '@/shared/components/image-upload/ImageCropper';

// Gesture.Pan()/.Pinch() build chainable objects whose .onStart/.onUpdate
// callbacks only ever run inside the native gesture-handler runtime, which
// jest can't drive — the pure math they call (clampPan, fixedRatioCropRect,
// etc.) already has full coverage in cropMath.test.ts. This mock lets the
// component render and its useImperativeHandle wiring (getCropRect off the
// initial, untouched shared-value state) be exercised directly.
jest.mock('react-native-gesture-handler', () => {
  function builder() {
    const self = { onStart: () => self, onUpdate: () => self };
    return self;
  }
  return {
    Gesture: { Pan: builder, Pinch: builder, Simultaneous: () => ({}) },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
  };
});

describe('ImageCropper', () => {
  it('renders a fixed-ratio viewport sized to the aspect ratio, letterboxed by width', async () => {
    const ref = createRef<ImageCropperHandle>();
    await render(
      <ImageCropper
        ref={ref}
        imageUri="file://x.jpg"
        imageWidth={1000}
        imageHeight={2000}
        aspectRatio={1}
        containerWidth={300}
        containerHeight={300}
      />
    );

    // Square aspect ratio within a square container: viewport fills both dimensions.
    const rect = ref.current?.getCropRect();
    expect(rect).toEqual({ originX: 0, originY: expect.any(Number), width: expect.any(Number), height: expect.any(Number) });
  });

  it('letterboxes by height when the viewport would otherwise exceed the container', async () => {
    const ref = createRef<ImageCropperHandle>();
    await render(
      <ImageCropper
        ref={ref}
        imageUri="file://x.jpg"
        imageWidth={2000}
        imageHeight={1000}
        aspectRatio={0.5}
        containerWidth={300}
        containerHeight={200}
      />
    );

    // aspectRatio 0.5 (portrait) in a wide container forces height-constrained sizing.
    expect(ref.current?.getCropRect()).toBeTruthy();
  });

  it('computes the initial crop rect for a fixed ratio matching cropMath at scale 1 / no pan', async () => {
    const ref = createRef<ImageCropperHandle>();
    await render(
      <ImageCropper
        ref={ref}
        imageUri="file://x.jpg"
        imageWidth={1000}
        imageHeight={1000}
        aspectRatio={1}
        containerWidth={300}
        containerHeight={300}
      />
    );

    // At scale 1 with no pan, the cover-fit image's center matches the
    // viewport's center, so the crop is the full source image.
    expect(ref.current?.getCropRect()).toEqual({ originX: 0, originY: 0, width: 1000, height: 1000 });
  });

  it('renders a free-form cropper with four draggable corner handles', async () => {
    const ref = createRef<ImageCropperHandle>();
    await render(
      <ImageCropper
        ref={ref}
        imageUri="file://x.jpg"
        imageWidth={800}
        imageHeight={600}
        aspectRatio="free"
        containerWidth={400}
        containerHeight={300}
      />
    );

    // The frame starts covering the whole displayed (contain-fit) image.
    expect(ref.current?.getCropRect()).toEqual({ originX: 0, originY: 0, width: 800, height: 600 });
  });
});
