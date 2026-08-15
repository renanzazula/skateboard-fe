import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/features/account/hooks/useProfile';
import { useTheme } from '@/shared/hooks/use-theme';

const AVATAR_SIZE = 48;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The screen's opening element — replaces the old flat "Profile" row.
 * Same destination (Profile screen), just promoted to a hero card with the
 * redesign's one signature element: a 3px gold left-bar. See
 * .docs/SETTINGS_REDESIGN.md §4.
 */
export function ProfileHero() {
  const theme = useTheme();
  const { profile, isLoading } = useProfile();

  const displayName = profile?.displayName || profile?.username || 'Skater';
  const handle = profile?.username ? `@${profile.username} · Barcelona` : 'Barcelona';

  return (
    <Pressable
      onPress={() => router.push('/settings/profile')}
      accessibilityRole="button"
      accessibilityLabel="Edit profile"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderColor: theme.border },
      ]}>
      <View style={[styles.goldBar, { backgroundColor: theme.primary }]} />
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          {profile?.profilePictureUrl ? (
            <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarInitials, { color: theme.onPrimary }]}>{isLoading ? '' : initials(displayName)}</Text>
          )}
        </View>

        <View style={styles.textStack}>
          <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            {handle}
          </Text>
        </View>

        <Text style={[styles.edit, { color: theme.primary }]}>Edit</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  goldBar: {
    width: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
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
    fontSize: 16,
    fontWeight: '700',
  },
  textStack: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    fontWeight: '400',
  },
  edit: {
    fontSize: 13,
    fontWeight: '600',
  },
});
