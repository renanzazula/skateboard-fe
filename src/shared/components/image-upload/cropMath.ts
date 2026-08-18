/**
 * Pure geometry for ImageCropper.tsx, kept out of the gesture-handling
 * component so the math (screen-space transform <-> original-image pixel
 * rect) can be reasoned about/tested independently of reanimated shared
 * values.
 */

export type CropRect = { originX: number; originY: number; width: number; height: number };

// Referenced from gesture .onUpdate worklets (UI thread) as well as plain JS
// call sites, so every function below that's used from a gesture handler
// carries its own 'worklet' directive — reanimated's Babel plugin only
// worklet-ifies functions across file boundaries when the directive is
// present, unlike same-file helpers which get it inferred automatically.
export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

// ── Fixed-ratio mode: viewport is fixed, the image pans/zooms underneath it ──

/** Scale at which the image fully covers the viewport with no gaps (like CSS `background-size: cover`). */
export function coverBaseScale(viewportW: number, viewportH: number, imgW: number, imgH: number): number {
  'worklet';
  return Math.max(viewportW / imgW, viewportH / imgH);
}

/** Max |translate| in screen px before the image's edge would enter the viewport, at the given total scale. */
export function maxPanOffset(viewportSize: number, imgSize: number, totalScale: number): number {
  'worklet';
  const displayed = imgSize * totalScale;
  return Math.max(0, (displayed - viewportSize) / 2);
}

export function clampPan(
  translateX: number,
  translateY: number,
  viewportW: number,
  viewportH: number,
  imgW: number,
  imgH: number,
  totalScale: number
): { x: number; y: number } {
  'worklet';
  const maxX = maxPanOffset(viewportW, imgW, totalScale);
  const maxY = maxPanOffset(viewportH, imgH, totalScale);
  return { x: clamp(translateX, -maxX, maxX), y: clamp(translateY, -maxY, maxY) };
}

/**
 * Converts the current pan/zoom transform into a crop rect in the original
 * image's pixel space. `translateX/Y` are the image's offset from center, in
 * screen px, same convention as an Animated `transform: [{translateX}]`.
 */
export function fixedRatioCropRect(params: {
  viewportW: number;
  viewportH: number;
  imgW: number;
  imgH: number;
  scale: number; // zoom multiplier on top of the cover base scale
  translateX: number;
  translateY: number;
}): CropRect {
  const { viewportW, viewportH, imgW, imgH, scale, translateX, translateY } = params;
  const totalScale = coverBaseScale(viewportW, viewportH, imgW, imgH) * scale;
  const displayedW = imgW * totalScale;
  const displayedH = imgH * totalScale;

  // Viewport's top-left corner, relative to the displayed image's top-left, in screen px.
  const originScreenX = (displayedW - viewportW) / 2 - translateX;
  const originScreenY = (displayedH - viewportH) / 2 - translateY;

  const originX = clamp(originScreenX / totalScale, 0, imgW - viewportW / totalScale);
  const originY = clamp(originScreenY / totalScale, 0, imgH - viewportH / totalScale);
  const width = clamp(viewportW / totalScale, 1, imgW - originX);
  const height = clamp(viewportH / totalScale, 1, imgH - originY);

  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(width),
    height: Math.round(height),
  };
}

// ── Free-form mode: image is displayed at a fixed "contain" size, a resizable frame selects the crop ──

export function containSize(containerW: number, containerH: number, imgW: number, imgH: number) {
  const scale = Math.min(containerW / imgW, containerH / imgH);
  return { width: imgW * scale, height: imgH * scale, scale };
}

/** Converts a crop frame in displayed (contain-fit) screen px into original-image pixel space. */
export function freeFormCropRect(params: {
  displayScale: number; // from containSize()
  imgW: number;
  imgH: number;
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
}): CropRect {
  const { displayScale, imgW, imgH, frameX, frameY, frameW, frameH } = params;
  const originX = clamp(frameX / displayScale, 0, imgW);
  const originY = clamp(frameY / displayScale, 0, imgH);
  const width = clamp(frameW / displayScale, 1, imgW - originX);
  const height = clamp(frameH / displayScale, 1, imgH - originY);

  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export const FREE_FORM_MIN_FRAME_SIZE = 40;

export type FrameRect = { x: number; y: number; w: number; h: number };
export type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

/** Resizes one corner of the free-form crop frame, keeping the opposite corner fixed. */
export function updateFreeFormCorner(
  corner: Corner,
  dx: number,
  dy: number,
  start: FrameRect,
  displayW: number,
  displayH: number
): FrameRect {
  'worklet';
  const min = FREE_FORM_MIN_FRAME_SIZE;
  const right = start.x + start.w;
  const bottom = start.y + start.h;

  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  if (corner === 'topLeft' || corner === 'bottomLeft') {
    x = clamp(start.x + dx, 0, right - min);
    w = right - x;
  } else {
    const newRight = clamp(right + dx, x + min, displayW);
    w = newRight - x;
  }

  if (corner === 'topLeft' || corner === 'topRight') {
    y = clamp(start.y + dy, 0, bottom - min);
    h = bottom - y;
  } else {
    const newBottom = clamp(bottom + dy, y + min, displayH);
    h = newBottom - y;
  }

  return { x, y, w, h };
}
