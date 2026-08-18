import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { BrandedLogo } from '@/features/branding/components/BrandedLogo';
import { useTheme } from '@/shared/hooks/use-theme';

const AVATAR_SIZE = 36;

// Same fallback ProfileHero uses when no profile picture is set.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Home dashboard header: profile picture (left) | podcast logo (middle) |
 * username (right). The avatar opens Settings, where the profile lives.
 */
export function HomeHeader() {
  const theme = useTheme();
  const { profile, isLoading } = useProfile();

  const displayName = profile?.displayName || profile?.username || 'Skater';
  const username = profile?.username ? `@${profile.username}` : displayName;

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={8}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            {profile?.profilePictureUrl ? (
              <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: theme.onPrimary }]}>
                {isLoading ? '' : initials(displayName)}
              </Text>
            )}
          </View>
        </Pressable>
      </View>

      <BrandedLogo style={styles.logo} />

      <View style={[styles.side, styles.right]}>
        <Text style={[styles.username, { color: theme.textPrimary }]} numberOfLines={1}>
          {username}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Equal-flex sides keep the logo optically centered regardless of how
  // wide the username renders.
  side: {
    flex: 1,
  },
  right: {
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
    fontSize: 13,
    fontWeight: '700',
  },
  logo: {
    width: 120,
    height: 32,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
  },
});
