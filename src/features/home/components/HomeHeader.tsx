import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { BrandedLogo } from '@/features/branding/components/BrandedLogo';
import { ThemedText } from '@/shared/components/themed-text';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

const AVATAR_SIZE = 34;
const LOGO_HEIGHT = 28;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Home's top bar: profile picture (left) — podcast logo (center) — username (right). */
export function HomeHeader() {
  const theme = useTheme();
  const { profile } = useProfile();

  const displayName = profile?.displayName || profile?.username || 'Skater';
  const username = profile?.username ? `@${profile.username}` : displayName;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.side}>
          <Pressable
            onPress={() => router.push('/settings/profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={({ pressed }) => [
              styles.avatar,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}>
            {profile?.profilePictureUrl ? (
              <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: theme.onPrimary }]}>{initials(displayName)}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.center}>
          <BrandedLogo style={styles.logo} />
        </View>

        <View style={[styles.side, styles.sideRight]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {username}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
