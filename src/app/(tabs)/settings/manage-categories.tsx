import { Redirect } from 'expo-router';
import { ChevronDown, ChevronUp, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { useCategoryAdmin, type AdminCategory } from '@/features/podcast/hooks/useCategoryAdmin';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { TextField } from '@/shared/components/TextField';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

/**
 * Admin management of the category rail (README_CATEGORY_MANAGEMENT_PLAN.md
 * phase 4): rename via custom-name override, reorder with up/down buttons
 * (mouse-, thumb- and keyboard-friendly — no drag dependency), and pick the
 * single default the Podcast tab opens on. Slugs never change, so nothing
 * here can break deep links or feed cache keys.
 */
export default function ManageCategoriesScreen() {
  const colors = useTheme();
  const { hasAuthority } = useAuth();
  const { submitting, listCategories, renameCategory, reorderCategories, setDefaultCategory } =
    useCategoryAdmin();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [renaming, setRenaming] = useState<AdminCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await listCategories());
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setLoading(false);
    }
  }, [listCategories]);

  useEffect(() => {
    load();
  }, [load]);

  if (!hasAuthority('FUNC_PODCAST_MANAGE_CATEGORIES')) {
    return <Redirect href="/settings" />;
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (submitting || target < 0 || target >= categories.length) return;
    const previous = categories;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next); // optimistic — rolled back on failure
    try {
      setCategories(await reorderCategories(next.map((c) => c.id!)));
    } catch (reorderError) {
      setCategories(previous);
      showAlert('Could not reorder', isBffError(reorderError) ? reorderError.message : 'Try again.');
    }
  };

  const makeDefault = async (category: AdminCategory) => {
    if (submitting || category.default) return;
    try {
      await setDefaultCategory(category.id!);
      setCategories((prev) => prev.map((c) => ({ ...c, default: c.id === category.id })));
    } catch (defaultError) {
      showAlert('Could not set default', isBffError(defaultError) ? defaultError.message : 'Try again.');
    }
  };

  const openRename = (category: AdminCategory) => {
    setRenaming(category);
    setRenameValue(category.name ?? '');
  };

  const submitRename = async (name: string | null) => {
    if (!renaming || submitting) return;
    try {
      const updated = await renameCategory(renaming.id!, name);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setRenaming(null);
    } catch (renameError) {
      showAlert('Could not rename', isBffError(renameError) ? renameError.message : 'Try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Manage categories" />
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Manage categories" />
        <ErrorBanner message={isBffError(error) ? error.message : 'Could not load categories.'} onRetry={load} />
      </View>
    );
  }

  const renderRow = ({ item, index }: { item: AdminCategory; index: number }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        !item.enabled && styles.rowDisabled,
      ]}>
      <Pressable
        style={styles.rowBody}
        onPress={() => openRename(item)}
        accessibilityRole="button"
        accessibilityLabel={`Rename ${item.name}`}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.default ? (
            <View style={[styles.defaultTag, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.defaultTagText, { color: colors.primary }]}>DEFAULT</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.postCount ?? 0} episodes
          {item.customName ? ` · YouTube: ${item.youtubeName}` : ''}
          {!item.enabled ? ' · playlist removed' : ''}
        </Text>
      </Pressable>

      <View style={styles.rowActions}>
        <Pressable
          onPress={() => makeDefault(item)}
          disabled={submitting || !!item.default}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={item.default ? `${item.name} is the default` : `Make ${item.name} the default`}>
          <Star
            size={20}
            color={item.default ? colors.primary : colors.textMuted}
            fill={item.default ? colors.primary : 'transparent'}
          />
        </Pressable>
        <Pressable
          onPress={() => move(index, -1)}
          disabled={submitting || index === 0}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Move ${item.name} up`}>
          <ChevronUp size={22} color={index === 0 ? colors.textDisabled : colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => move(index, 1)}
          disabled={submitting || index === categories.length - 1}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Move ${item.name} down`}>
          <ChevronDown
            size={22}
            color={index === categories.length - 1 ? colors.textDisabled : colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Manage categories" />
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id!}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Tap a category to rename it. The starred category is what the Podcast tab opens on.
            Categories mirror the channel&apos;s YouTube playlists — new playlists appear at the
            bottom until you move them.
          </Text>
        }
      />

      <Modal visible={renaming !== null} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rename category</Text>
            <TextField
              label={renaming?.customName ? `YouTube title: ${renaming.youtubeName}` : undefined}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={renaming?.youtubeName ?? ''}
              autoFocus
            />
            <PrimaryButton
              title="Save"
              loading={submitting}
              onPress={() => submitRename(renameValue.trim() ? renameValue.trim() : null)}
            />
            {renaming?.customName ? (
              <SecondaryButton title="Reset to YouTube title" onPress={() => submitRename(null)} />
            ) : null}
            <SecondaryButton title="Cancel" onPress={() => setRenaming(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    marginTop: Spacing.six,
  },
  listContent: {
    padding: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  defaultTag: {
    borderRadius: RADII.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  meta: {
    fontSize: 12.5,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  separator: {
    height: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
});
