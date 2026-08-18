import { Image } from 'expo-image';
import { useEffect, useState } from 'react';

const ratioCache = new Map<string, number>();
const inflight = new Map<string, Promise<number>>();

// YouTube serves every thumbnail at a fixed size per filename, so the ratio is
// knowable from the URL alone — no probe, and therefore no layout shift once
// it resolves. Sizes per the YouTube thumbnail conventions.
const YOUTUBE_THUMBNAIL_RATIOS: Record<string, number> = {
  maxresdefault: 1280 / 720,
  sddefault: 640 / 480,
  hqdefault: 480 / 360,
  mqdefault: 320 / 180,
  default: 120 / 90,
};

// Parsed with a regex rather than `new URL()`: React Native's built-in URL
// implementation is incomplete (no reliable hostname/pathname), and this runs
// on web and native alike.
const YOUTUBE_THUMBNAIL_URL = /^https?:\/\/(?:i\d?\.ytimg\.com|img\.youtube\.com)\/[^?#]*\/([a-z0-9_-]+)\.[a-z]+(?:[?#]|$)/i;

/**
 * Ratio derivable without touching the network: YouTube's thumbnail URLs encode
 * their pixel size in the filename. Returns undefined for anything else.
 */
export function ratioFromUrl(uri: string): number | undefined {
  const match = YOUTUBE_THUMBNAIL_URL.exec(uri);
  return match ? YOUTUBE_THUMBNAIL_RATIOS[match[1].toLowerCase()] : undefined;
}

/** Last resort: download/decode enough of the image to read its real dimensions. */
function resolveRatio(uri: string): Promise<number> {
  const cached = ratioCache.get(uri);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = inflight.get(uri);
  if (pending) return pending;

  const promise = Image.loadAsync(uri, { maxWidth: 640 }).then((ref) => {
    const ratio = ref.width / ref.height;
    ratioCache.set(uri, ratio);
    inflight.delete(uri);
    return ratio;
  });
  inflight.set(uri, promise);
  return promise;
}

/**
 * Aspect ratio for a gallery tile, cheapest source first:
 *
 *   1. `knownRatio` — dimensions the backend captured at sync time (no work).
 *   2. the URL itself, for YouTube-hosted thumbnails (no work).
 *   3. probing the image, which resolves a frame later and therefore reflows
 *      the masonry column — the case worth avoiding.
 *
 * Tiers 1 and 2 return synchronously on first render, so tiles sized by them
 * never shift.
 */
export function useImageAspectRatio(uri: string | null, knownRatio?: number): number | undefined {
  const synchronous = knownRatio ?? (uri ? (ratioCache.get(uri) ?? ratioFromUrl(uri)) : undefined);
  const [probed, setProbed] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!uri || synchronous !== undefined) return;

    let cancelled = false;
    resolveRatio(uri).then((resolved) => {
      if (!cancelled) setProbed(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [uri, synchronous]);

  return synchronous ?? probed;
}
