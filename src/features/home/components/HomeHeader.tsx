import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { BrandedLogo } from '@/features/branding/components/BrandedLogo';
import { AppHeader } from '@/shared/components/AppHeader';
import { ThemedText } from '@/shared/components/themed-text';
import { useTheme } from '@/shared/hooks/use-theme';

const AVATAR_SIZE = 34;
const LOGO_HEIGHT = 28;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Home's top bar: profile picture (left) — podcast logo (centre) — username
 * (right). Rendered through AppHeader so it's exactly as tall as the title
 * header every other screen uses.
 */
export function HomeHeader() {
  const theme = useTheme();
  const { profile } = useProfile();
  const [imageFailed, setImageFailed] = useState(false);

  const displayName = profile?.displayName || profile?.username || 'Skater';
  const username = profile?.username ? `@${profile.username}` : displayName;

  // Reset once the URL itself changes (e.g. a fresh upload), so a past
  // failure doesn't permanently pin the fallback for the new image.
  useEffect(() => {
    setImageFailed(false);
  }, [profile?.profilePictureUrl]);

  const showImage = !!profile?.profilePictureUrl && !imageFailed;

  return (
    <AppHeader>
      <View style={styles.row}>
        <View style={styles.side}>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            style={({ pressed }) => [styles.avatar, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}>
            {showImage ? (
              <Image
                source={{ uri: profile.profilePictureUrl }}
                style={styles.avatarImage}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <Text style={[styles.avatarInitials, { color: theme.onPrimary }]}>{initials(displayName)}</Text>
            )}
          </Pressable>
        </View>

        <BrandedLogo style={styles.logo} />

        <View style={[styles.side, styles.sideRight]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {username}
          </ThemedText>
        </View>
      </View>
    </AppHeader>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Equal-flex sides keep the logo optically centred however wide the
  // username renders.
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '700',
  },
  logo: {
    width: 120,
    height: LOGO_HEIGHT,
  },
});
