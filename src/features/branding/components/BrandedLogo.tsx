import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { useAppConfig } from '@/core/config';

type Props = {
  style?: StyleProp<ImageStyle>;
};

/**
 * Renders the tenant-configured app logo (GET /api/config's appLogoUrl),
 * cache-busted by its version so admin uploads invalidate immediately. There
 * is no bundled default logo asset in this app yet (only a generic app
 * icon/splash image) — renders nothing until one is configured or a bundled
 * fallback is added.
 */
export function BrandedLogo({ style }: Props) {
  const { appLogoUrl, appLogoVersion } = useAppConfig();

  if (!appLogoUrl) {
    return null;
  }

  return (
    <Image
      source={{ uri: `${appLogoUrl}?v=${appLogoVersion}` }}
      style={style}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}
