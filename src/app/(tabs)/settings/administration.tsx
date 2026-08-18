import { Redirect, router } from 'expo-router';
import { Home, Mic, Palette } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

export default function AdministrationScreen() {
  const { hasAuthority } = useAuth();
  const { profile } = useProfile();

  const canManageBranding = hasAuthority('FUNC_TAB_SETTINGS_BRANDING');
  const canConfigureHomeCategories = hasAuthority('FUNC_HOME_CATEGORY_CONFIG');
  const canAdministerPodcast = hasAuthority('FUNC_PODCAST_IMPORT_JSON') || hasAuthority('FUNC_PODCAST_MANAGE_CATEGORIES');

  if (!canManageBranding && !canConfigureHomeCategories && !canAdministerPodcast) {
    return <Redirect href="/settings" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Administration" handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canManageBranding ? (
          <SettingsRow
            icon={Palette}
            title="Branding"
            subtitle="Manage login background, app logo & assets"
            onPress={() => router.push('/settings/branding')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canConfigureHomeCategories ? (
          <SettingsRow
            icon={Home}
            title="Home Video Categories"
            subtitle="Choose which categories appear on the Home dashboard"
            onPress={() => router.push('/settings/home-categories')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canAdministerPodcast ? (
          <SettingsRow
            icon={Mic}
            title="Podcast sync"
            subtitle="Sync now & manage categories"
            onPress={() => router.push('/settings/podcast-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
});
