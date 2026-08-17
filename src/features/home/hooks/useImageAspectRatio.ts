import { Image } from 'expo-image';
import { useEffect, useState } from 'react';

const ratioCache = new Map<string, number>();
const inflight = new Map<string, Promise<number>>();

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

export function useImageAspectRatio(uri: string | null): number | undefined {
  const [ratio, setRatio] = useState<number | undefined>(() => (uri ? ratioCache.get(uri) : undefined));

  useEffect(() => {
    if (!uri || ratioCache.has(uri)) return;

    let cancelled = false;
    resolveRatio(uri).then((resolved) => {
      if (!cancelled) setRatio(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return uri ? (ratioCache.get(uri) ?? ratio) : undefined;
}
