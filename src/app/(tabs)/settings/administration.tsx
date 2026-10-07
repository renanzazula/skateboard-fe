import { Redirect, router } from 'expo-router';
import { Code, FileText, Home, Info, Mail, Megaphone, Mic, Music, Palette, Shield, Users } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function AdministrationScreen() {
  const { hasAuthority } = useAuth();
  const { profile } = useProfile();
  const { t } = useTranslation();

  const canManageBranding = hasAuthority('FUNC_TAB_SETTINGS_BRANDING');
  const canConfigureHomeCategories = hasAuthority('FUNC_HOME_CATEGORY_CONFIG');
  const canConfigureFeaturedPlayer = hasAuthority('FUNC_HOME_FEATURED_PLAYER_CONFIG');
  const canAdministerPodcast = hasAuthority('FUNC_PODCAST_IMPORT_JSON') || hasAuthority('FUNC_PODCAST_MANAGE_CATEGORIES');
  const canManageAboutUs = hasAuthority('FUNC_ABOUT_US_MANAGE');
  const canManagePrivacyPolicy = hasAuthority('FUNC_PRIVACY_POLICY_MANAGE');
  const canManageTerms = hasAuthority('FUNC_TERMS_MANAGE');
  const canManageLicenses = hasAuthority('FUNC_LICENSES_MANAGE');
  const canManageGuestApplications = hasAuthority('FUNC_GUEST_APPLICATION_MANAGE');
  const canConfigureGuestApplications = hasAuthority('FUNC_GUEST_APPLICATION_CONFIGURE');
  const canManageEmailTemplates = hasAuthority('FUNC_EMAIL_TEMPLATE_MANAGE');
  // Campaign READ alone (which STANDARD holds) does not open the admin area;
  // the row shows for anyone who can already see this section and can also
  // manage/publish campaigns. STANDARD users never reach here.
  const canReadCampaigns =
    hasAuthority('FUNC_CAMPAIGN_MANAGE') || hasAuthority('FUNC_CAMPAIGN_PUBLISH');

  if (
    !canManageBranding &&
    !canConfigureHomeCategories &&
    !canConfigureFeaturedPlayer &&
    !canAdministerPodcast &&
    !canManageAboutUs &&
    !canManagePrivacyPolicy &&
    !canManageTerms &&
    !canManageLicenses &&
    !canReadCampaigns &&
    !canManageGuestApplications &&
    !canConfigureGuestApplications &&
    !canManageEmailTemplates
  ) {
    return <Redirect href="/settings" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.administration.title')} handle={profile?.username ? `@${profile.username}` : undefined} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection label={t('admin.administration.sectionConfiguration')}>
        {canManageBranding ? (
          <SettingsRow
            icon={Palette}
            title={t('admin.administration.branding')}
            subtitle={t('admin.administration.brandingSubtitle')}
            onPress={() => router.push('/settings/branding')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canConfigureHomeCategories ? (
          <SettingsRow
            icon={Home}
            title={t('admin.administration.homeCategories')}
            subtitle={t('admin.administration.homeCategoriesSubtitle')}
            onPress={() => router.push('/settings/home-categories')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canConfigureFeaturedPlayer ? (
          <SettingsRow
            icon={Music}
            title={t('admin.administration.featuredPlayer')}
            subtitle={t('admin.administration.featuredPlayerSubtitle')}
            onPress={() => router.push('/settings/featured-player')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canAdministerPodcast ? (
          <SettingsRow
            icon={Mic}
            title={t('admin.administration.podcastSync')}
            subtitle={t('admin.administration.podcastSyncSubtitle')}
            onPress={() => router.push('/settings/podcast-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canManageAboutUs ? (
          <SettingsRow
            icon={Info}
            title={t('admin.administration.aboutUs')}
            subtitle={t('admin.administration.aboutUsSubtitle')}
            onPress={() => router.push('/settings/about-us-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canManagePrivacyPolicy ? (
          <SettingsRow
            icon={Shield}
            title={t('admin.administration.privacyPolicy')}
            subtitle={t('admin.administration.privacyPolicySubtitle')}
            onPress={() => router.push('/settings/privacy-policy-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canManageTerms ? (
          <SettingsRow
            icon={FileText}
            title={t('admin.administration.terms')}
            subtitle={t('admin.administration.termsSubtitle')}
            onPress={() => router.push('/settings/terms-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canManageLicenses ? (
          <SettingsRow
            icon={Code}
            title={t('admin.administration.licenses')}
            subtitle={t('admin.administration.licensesSubtitle')}
            onPress={() => router.push('/settings/licenses-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canReadCampaigns ? (
          <SettingsRow
            icon={Megaphone}
            title={t('admin.administration.campaigns')}
            subtitle={t('admin.administration.campaignsSubtitle')}
            onPress={() => router.push('/settings/campaigns')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canManageGuestApplications ? (
          <SettingsRow
            icon={Users}
            title={t('admin.administration.guestApplications')}
            subtitle={t('admin.administration.guestApplicationsSubtitle')}
            onPress={() => router.push('/settings/guest-applications-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canConfigureGuestApplications ? (
          <SettingsRow
            icon={Users}
            title={t('admin.administration.guestApplicationSettings')}
            subtitle={t('admin.administration.guestApplicationSettingsSubtitle')}
            onPress={() => router.push('/settings/guest-application-settings-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        {canManageEmailTemplates ? (
          <SettingsRow
            icon={Mail}
            title={t('admin.administration.emailTemplates')}
            subtitle={t('admin.administration.emailTemplatesSubtitle')}
            onPress={() => router.push('/settings/email-templates-admin')}
            trailing={{ type: 'chevron' }}
          />
        ) : null}
        </SettingsSection>
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
