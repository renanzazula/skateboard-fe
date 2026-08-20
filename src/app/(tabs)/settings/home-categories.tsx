import { Redirect } from 'expo-router';
import { Tag } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { CategoryChip } from '@/features/podcast/components/CategoryChip';
import { useCategories } from '@/features/podcast/hooks/useCategories';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import type { HomeCategoryConfigMode } from '@/features/home/hooks/useHomeCategoryAdmin';
import { useHomeCategoryAdmin } from '@/features/home/hooks/useHomeCategoryAdmin';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

// README_HOME_DASHBOARD.md §22.9: admin-only screen controlling which video
// categories are eligible for the mobile Home dashboard. Default is ALL
// (README_HOME_DASHBOARD.md §22 — nothing to configure post-deploy);
// SELECTED requires at least one category, enforced both here (disabled
// Save) and server-side (400 if violated anyway).
export default function HomeCategoriesScreen() {
  const theme = useTheme();
  const { hasAuthority } = useAuth();
  const { submitting, getConfig, updateConfig } = useHomeCategoryAdmin();
  const { categories, isLoading: categoriesLoading, error: categoriesError, refresh: refreshCategories } =
    useCategories();

  const [mode, setMode] = useState<HomeCategoryConfigMode>('ALL');
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<Error | null>(null);

  const canConfigure = hasAuthority('FUNC_HOME_CATEGORY_CONFIG');

  const refresh = useCallback(async () => {
    setLoading(true);
    setConfigError(null);
    try {
      const config = await getConfig();
      setMode(config.mode ?? 'ALL');
      setSelectedSlugs(new Set(config.enabledCategoryIds ?? []));
    } catch (loadError) {
      setConfigError(loadError as Error);
    } finally {
      setLoading(false);
    }
    // getConfig is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canConfigure) refresh();
  }, [canConfigure, refresh]);

  if (!canConfigure) {
    return <Redirect href="/settings" />;
  }

  const toggleCategory = (slug: string, enabled: boolean) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const handleRetry = () => {
    refresh();
    refreshCategories();
  };

  const handleSave = async () => {
    try {
      await updateConfig(mode, mode === 'SELECTED' ? Array.from(selectedSlugs) : []);
      showAlert('Saved', 'Home video categories updated.');
    } catch (saveError) {
      showAlert('Could not save', isBffError(saveError) ? saveError.message : 'Try again.');
    }
  };

  const canSave = mode === 'ALL' || selectedSlugs.size > 0;
  const isLoading = loading || categoriesLoading;
  const error = configError ?? categoriesError;

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title="Home Video Categories" />
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title="Home Video Categories" />
        <ErrorBanner message={isBffError(error) ? error.message : 'Could not load Home categories.'} onRetry={handleRetry} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Home Video Categories" />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="default" themeColor="textSecondary" style={styles.hint}>
          Choose which video categories can appear on the Home dashboard. Videos from disabled categories
          are only hidden from Home — nothing is deleted, and other screens are unaffected.
        </ThemedText>

        <View style={styles.modeRow}>
          <CategoryChip label="All categories" selected={mode === 'ALL'} onPress={() => setMode('ALL')} />
          <CategoryChip label="Selected categories" selected={mode === 'SELECTED'} onPress={() => setMode('SELECTED')} />
        </View>

        {mode === 'SELECTED' ? (
          <View style={[styles.categoryList, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {categories.map((category) => (
              <SettingsRow
                key={category.id}
                icon={Tag}
                title={category.name}
                trailing={{
                  type: 'switch',
                  value: selectedSlugs.has(category.slug),
                  onChange: (value) => toggleCategory(category.slug, value),
                }}
              />
            ))}
            {!canSave ? (
              <ThemedText type="small" themeColor="destructive" style={styles.validationHint}>
                Select at least one category.
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <PrimaryButton title="Save" loading={submitting} disabled={!canSave} onPress={handleSave} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    marginTop: Spacing.six,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  hint: {
    lineHeight: 19,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryList: {
    borderWidth: 1,
    borderRadius: RADII.card,
    overflow: 'hidden',
  },
  validationHint: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
