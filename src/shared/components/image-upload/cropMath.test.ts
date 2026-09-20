import {
  clamp,
  clampPan,
  containSize,
  coverBaseScale,
  fixedRatioCropRect,
  freeFormCropRect,
  maxPanOffset,
  updateFreeFormCorner,
  FREE_FORM_MIN_FRAME_SIZE,
} from '@/shared/components/image-upload/cropMath';

describe('clamp', () => {
  it('clamps a value into [min, max]', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('coverBaseScale', () => {
  it('picks the larger of the two axis ratios, so the image covers the viewport', () => {
    // Viewport wider relative to image -> width ratio dominates.
    expect(coverBaseScale(200, 100, 100, 100)).toBeCloseTo(2);
    // Viewport taller relative to image -> height ratio dominates.
    expect(coverBaseScale(100, 200, 100, 100)).toBeCloseTo(2);
  });
});

describe('maxPanOffset', () => {
  it('is 0 when the displayed image exactly fills the viewport', () => {
    expect(maxPanOffset(100, 100, 1)).toBe(0);
  });

  it('is half the overflow when the image is larger than the viewport', () => {
    // displayed = 100 * 2 = 200, viewport 100 -> overflow 100, half = 50
    expect(maxPanOffset(100, 100, 2)).toBe(50);
  });

  it('never goes negative when the displayed image is smaller than the viewport', () => {
    expect(maxPanOffset(200, 100, 1)).toBe(0);
  });
});

describe('clampPan', () => {
  it('clamps both axes independently to their own max pan offset', () => {
    // totalScale=2, imgW=imgH=100 => displayed 200x200, viewport 100x100 => maxOffset 50 each axis
    const result = clampPan(1000, -1000, 100, 100, 100, 100, 2);
    expect(result).toEqual({ x: 50, y: -50 });
  });

  it('passes through an in-range pan unchanged', () => {
    const result = clampPan(10, -10, 100, 100, 100, 100, 2);
    expect(result).toEqual({ x: 10, y: -10 });
  });
});

describe('fixedRatioCropRect', () => {
  it('returns the full image at scale 1 when the viewport matches the cover-fit size exactly', () => {
    // imgW=imgH=200, viewport 100x100 -> coverBaseScale = 0.5, so full image is displayed as 100x100.
    const rect = fixedRatioCropRect({
      viewportW: 100,
      viewportH: 100,
      imgW: 200,
      imgH: 200,
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
    expect(rect).toEqual({ originX: 0, originY: 0, width: 200, height: 200 });
  });

  it('shifts the crop origin opposite to a positive translate', () => {
    const rect = fixedRatioCropRect({
      viewportW: 100,
      viewportH: 100,
      imgW: 200,
      imgH: 200,
      scale: 2, // zoomed in further, totalScale = 1
      translateX: 20,
      translateY: 0,
    });
    // totalScale = 0.5 * 2 = 1; originScreenX = (200-100)/2 - 20 = 30; originX = 30/1 = 30
    expect(rect.originX).toBe(30);
    expect(rect.originY).toBe(50);
  });

  it('clamps the crop rect within the image bounds when translated past an edge', () => {
    const rect = fixedRatioCropRect({
      viewportW: 100,
      viewportH: 100,
      imgW: 200,
      imgH: 200,
      scale: 1,
      translateX: 1000, // way past the edge
      translateY: 0,
    });
    expect(rect.originX).toBeGreaterThanOrEqual(0);
    expect(rect.originX + rect.width).toBeLessThanOrEqual(200);
  });
});

describe('containSize', () => {
  it('scales the image down to fit within the container, preserving aspect ratio', () => {
    const result = containSize(100, 50, 200, 200);
    expect(result.scale).toBeCloseTo(0.25);
    expect(result.width).toBeCloseTo(50);
    expect(result.height).toBeCloseTo(50);
  });
});

describe('freeFormCropRect', () => {
  it('converts a display-space frame into original-image pixel space', () => {
    const rect = freeFormCropRect({
      displayScale: 0.5,
      imgW: 200,
      imgH: 200,
      frameX: 10,
      frameY: 20,
      frameW: 40,
      frameH: 60,
    });
    expect(rect).toEqual({ originX: 20, originY: 40, width: 80, height: 120 });
  });

  it('clamps the frame within the image bounds', () => {
    const rect = freeFormCropRect({
      displayScale: 1,
      imgW: 100,
      imgH: 100,
      frameX: 90,
      frameY: 90,
      frameW: 50,
      frameH: 50,
    });
    expect(rect.originX + rect.width).toBeLessThanOrEqual(100);
    expect(rect.originY + rect.height).toBeLessThanOrEqual(100);
  });
});

describe('updateFreeFormCorner', () => {
  const start = { x: 20, y: 20, w: 100, h: 100 };
  const displayW = 300;
  const displayH = 300;

  it('resizes from the topLeft corner, keeping the bottom-right fixed', () => {
    const result = updateFreeFormCorner('topLeft', 10, 10, start, displayW, displayH);
    expect(result).toEqual({ x: 30, y: 30, w: 90, h: 90 });
  });

  it('resizes from the bottomRight corner, keeping the top-left fixed', () => {
    const result = updateFreeFormCorner('bottomRight', 10, 10, start, displayW, displayH);
    expect(result).toEqual({ x: 20, y: 20, w: 110, h: 110 });
  });

  it('resizes from the topRight corner (moves top edge, extends right edge)', () => {
    const result = updateFreeFormCorner('topRight', 10, -10, start, displayW, displayH);
    expect(result).toEqual({ x: 20, y: 10, w: 110, h: 110 });
  });

  it('resizes from the bottomLeft corner (extends bottom edge, moves left edge)', () => {
    const result = updateFreeFormCorner('bottomLeft', -10, 10, start, displayW, displayH);
    expect(result).toEqual({ x: 10, y: 20, w: 110, h: 110 });
  });

  it('never shrinks a dimension below FREE_FORM_MIN_FRAME_SIZE', () => {
    const result = updateFreeFormCorner('topLeft', 1000, 1000, start, displayW, displayH);
    expect(result.w).toBe(FREE_FORM_MIN_FRAME_SIZE);
    expect(result.h).toBe(FREE_FORM_MIN_FRAME_SIZE);
  });

  it('never grows past the display bounds', () => {
    const result = updateFreeFormCorner('bottomRight', 1000, 1000, start, displayW, displayH);
    expect(result.x + result.w).toBeLessThanOrEqual(displayW);
    expect(result.y + result.h).toBeLessThanOrEqual(displayH);
  });
});
