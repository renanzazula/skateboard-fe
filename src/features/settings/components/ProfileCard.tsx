import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAuth } from '@/core/auth';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { useProfile } from '@/features/account/hooks/useProfile';
import { EditableAvatar } from '@/features/settings/components/EditableAvatar';
import { InlineEditField } from '@/features/settings/components/InlineEditField';
import { Badge } from '@/shared/components/Badge';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

// Any of the authorities that unlock the Administration sub-screen counts as
// "admin" for the pill — see settings/administration.tsx and (tabs)/settings
// legacy index.tsx history for the same three checks.
const ADMIN_AUTHORITIES = ['FUNC_TAB_SETTINGS_BRANDING', 'FUNC_HOME_CATEGORY_CONFIG', 'FUNC_PODCAST_IMPORT_JSON', 'FUNC_PODCAST_MANAGE_CATEGORIES'];

/** Month and year, or null when the API sent nothing parseable. */
function formatMemberSince(createdAt: string | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The Settings home's opening element — avatar-as-upload-control, inline
 * username edit, and static email/role. Replaces ProfileHero (which linked
 * out to a separate Profile screen). See .docs/SETTINGS_REDESIGN_2.md §2/§6.
 */
type Props = {
  /**
   * Applied last so a caller can override the card's own margins. The
   * Settings home lets it sit inset on the screen background; a sub-screen
   * that already pads its content zeroes that out.
   */
  style?: StyleProp<ViewStyle>;
};

export function ProfileCard({ style }: Props) {
  const theme = useTheme();
  const { email, hasAuthority } = useAuth();
  const { profile, isLoading, refresh, updateDisplayName } = useProfile();
  const { changeUsername } = useAccountActions();

  const displayName = profile?.displayName || profile?.username || 'Skater';
  const isAdmin = ADMIN_AUTHORITIES.some(hasAuthority);
  const memberSince = formatMemberSince(profile?.createdAt);
  const isDeactivated = !!profile?.status && profile.status !== 'ACTIVE';

  const handleSaveUsername = async (next: string) => {
    if (next.length < 3) {
      throw new Error('Usernames must be at least 3 characters.');
    }
    await changeUsername(next);
    await refresh();
  };

  const handleSaveDisplayName = async (next: string) => {
    await updateDisplayName(next);
    await refresh();
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      <View style={styles.topRow}>
        <EditableAvatar imageUrl={profile?.profilePictureUrl ?? null} initials={isLoading ? '' : initials(displayName)} onUploaded={refresh} />

        <View style={styles.info}>
          {/* Display name sits above username because it is what the avatar
              initials and the Home greeting actually read — the field a
              change here is most visible in. */}
          <InlineEditField
            label="Display name"
            value={profile?.displayName ?? ''}
            placeholder="Add your name"
            onSave={handleSaveDisplayName}
          />
          <InlineEditField label="Username" value={profile?.username ?? ''} placeholder="username" onSave={handleSaveUsername} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.email, { color: theme.textSecondary }]} numberOfLines={1}>
          {email ?? 'No email on file'}
        </Text>
        <Badge label={isAdmin ? 'ADMIN' : 'MEMBER'} />
      </View>

      {/* Only rendered when there is something to say: an account that isn't
          active is worth flagging, but printing "ACTIVE" to everyone is not.
          createdAt is absent on accounts predating the field, so the line
          hides rather than showing an unparseable date. */}
      {isDeactivated ? (
        <Text style={[styles.status, { color: theme.destructive }]}>
          Account {profile?.status?.toLowerCase()}
        </Text>
      ) : null}
      {memberSince ? <Text style={[styles.since, { color: theme.textMuted }]}>Member since {memberSince}</Text> : null}
    </View>
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
    gap: Spacing.two,
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
  since: {
    fontSize: 12.5,
  },
  status: {
    fontSize: 12.5,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
