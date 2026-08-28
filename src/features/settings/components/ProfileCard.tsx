import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { EditableAvatar } from '@/features/settings/components/EditableAvatar';
import { Badge } from '@/shared/components/Badge';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

// Any of the authorities that unlock the Administration sub-screen counts as
// "admin" for the pill — see settings/administration.tsx and (tabs)/settings
// legacy index.tsx history for the same three checks.
const ADMIN_AUTHORITIES = ['FUNC_TAB_SETTINGS_BRANDING', 'FUNC_HOME_CATEGORY_CONFIG', 'FUNC_PODCAST_IMPORT_JSON', 'FUNC_PODCAST_MANAGE_CATEGORIES'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  /** Opens the account screen. The avatar keeps its own press behaviour. */
  onPress: () => void;
};

/**
 * The Settings home's opening element: who you are, and a way through to the
 * screen that changes it.
 *
 * It used to edit the username inline. Once Settings → Your account grew a
 * Username row of its own, the same value was editable in two places through
 * two different gestures one screen apart, so the editing moved there and this
 * became a summary. The picture is the exception — the avatar stays an upload
 * control here, because there is nowhere better for it and it is the one thing
 * on the card that reads as tappable on its own.
 */
export function ProfileCard({ onPress }: Props) {
  const theme = useTheme();
  const { email, hasAuthority } = useAuth();
  const { profile, isLoading, refresh } = useProfile();

  const displayName = profile?.displayName || profile?.username || 'Skater';
  const isAdmin = ADMIN_AUTHORITIES.some(hasAuthority);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open your account"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderColor: theme.border },
      ]}>
      <View style={styles.topRow}>
        {/* Its own Pressable, so tapping the picture uploads while tapping
            anywhere else on the card navigates. */}
        <EditableAvatar imageUrl={profile?.profilePictureUrl ?? null} initials={isLoading ? '' : initials(displayName)} onUploaded={refresh} />

        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          {profile?.username ? (
            <Text style={[styles.handle, { color: theme.textSecondary }]} numberOfLines={1}>
              @{profile.username}
            </Text>
          ) : null}
        </View>

        <ChevronRight color={theme.textMuted} size={18} />
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.email, { color: theme.textSecondary }]} numberOfLines={1}>
          {email ?? 'No email on file'}
        </Text>
        <Badge label={isAdmin ? 'ADMIN' : 'MEMBER'} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: Spacing.three,
    marginBottom: 10,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  handle: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  email: {
    flex: 1,
    fontSize: 13,
  },
});
