import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { useAppConfig } from '@/core/config';
import { warnImageUnreachable } from '@/features/branding/services/warnImageUnreachable';

type Props = {
  style?: StyleProp<ImageStyle>;
};

/**
 * Renders the tenant-configured app logo (GET /api/config's appLogoUrl).
 * The URL is a presigned S3 request whose signature covers the full query
 * string — appending anything (e.g. a `?v=` cache-buster) invalidates it and
 * the object store rejects the request. No manual busting is needed anyway:
 * the backend mints a fresh signed URL (new date/signature) on every fetch,
 * so `appLogoUrl` itself already changes whenever the logo is updated. There
 * is no bundled default logo asset in this app yet (only a generic app
 * icon/splash image) — renders nothing until one is configured or a bundled
 * fallback is added.
 */
export function BrandedLogo({ style }: Props) {
  const { appLogoUrl } = useAppConfig();

  if (!appLogoUrl) {
    return null;
  }

  return (
    <Image
      source={{ uri: appLogoUrl }}
      style={style}
      contentFit="contain"
      cachePolicy="memory-disk"
      onError={({ error }) => warnImageUnreachable('app logo', appLogoUrl, error)}
    />
  );
}
