import { Redirect } from 'expo-router';
import { Calendar, Music } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { CategoryChip } from '@/features/podcast/components/CategoryChip';
import type { FeaturedContentSource, HomePlayerPosition } from '@/features/home/hooks/useFeaturedPlayerAdmin';
import { useFeaturedPlayerAdmin } from '@/features/home/hooks/useFeaturedPlayerAdmin';
import { useFeaturedContentPicker } from '@/features/home/hooks/useFeaturedContentPicker';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Post } from '@/shared/types/posts';
import { showAlert } from '@/shared/utils/alert';

const CONTENT_SOURCE: FeaturedContentSource = 'PODCAST';

// README-home-featured-mini-player.md §8: admin-only screen for the Home
// dashboard's default Featured Player. Only one source (PODCAST) and one
// player type (MINI) exist today, so those are fixed rather than rendered as
// pickers with a single option — position (TOP/BOTTOM) is the one real
// choice besides enable + episode. Scheduling (§5) is a later phase; this
// screen only manages the always-on default.
export default function FeaturedPlayerScreen() {
  const theme = useTheme();
  const { hasAuthority } = useAuth();
  const { submitting, getConfig, updateConfig } = useFeaturedPlayerAdmin();
  const { search, setSearch, posts, isLoading: searching } = useFeaturedContentPicker();

  const [enabled, setEnabled] = useState(false);
  const [contentId, setContentId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [position, setPosition] = useState<HomePlayerPosition>('BOTTOM');
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<Error | null>(null);

  const canConfigure = hasAuthority('FUNC_HOME_FEATURED_PLAYER_CONFIG');

  const refresh = useCallback(async () => {
    setLoading(true);
    setConfigError(null);
    try {
      const config = await getConfig();
      setEnabled(config.enabled ?? false);
      setContentId(config.contentId ?? null);
      setPosition(config.position ?? 'BOTTOM');
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

  // The picker only returns a page of episodes — if the configured episode
  // isn't in the current search results, its title still needs to display.
  useEffect(() => {
    if (!contentId) {
      setSelectedPost(null);
      return;
    }
    const match = posts.find((p) => p.id === contentId);
    if (match) setSelectedPost(match);
  }, [contentId, posts]);

  if (!canConfigure) {
    return <Redirect href="/settings" />;
  }

  const handleSave = async () => {
    try {
      await updateConfig({
        enabled,
        contentSource: contentId ? CONTENT_SOURCE : null,
        contentId,
        playerType: 'MINI',
        position,
      });
      showAlert('Saved', 'Home Featured Player updated.');
    } catch (saveError) {
      showAlert('Could not save', isBffError(saveError) ? saveError.message : 'Try again.');
    }
  };

  const canSave = !enabled || Boolean(contentId);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title="Featured Player" />
        <ActivityIndicator style={styles.loading} color={theme.primary} />
      </ThemedView>
    );
  }

  if (configError) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title="Featured Player" />
        <ErrorBanner message={isBffError(configError) ? configError.message : 'Could not load the Featured Player configuration.'} onRetry={refresh} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title="Featured Player" />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="default" themeColor="textSecondary" style={styles.hint}>
          Show a compact player for one podcast episode on the Home dashboard. Off by default — nothing is
          shown until an episode is selected and enabled.
        </ThemedText>

        <SettingsRow
          icon={Music}
          title="Enable Featured Player"
          trailing={{ type: 'switch', value: enabled, onChange: setEnabled }}
        />

        {enabled ? (
          <>
            <View style={styles.section}>
              <ThemedText type="smallBold">Position</ThemedText>
              <View style={styles.modeRow}>
                <CategoryChip label="Top" selected={position === 'TOP'} onPress={() => setPosition('TOP')} />
                <CategoryChip label="Bottom" selected={position === 'BOTTOM'} onPress={() => setPosition('BOTTOM')} />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">Featured episode</ThemedText>

              {selectedPost ? (
                <View style={[styles.selectedRow, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}>
                  <EpisodeThumbnail post={selectedPost} />
                  <ThemedText type="small" style={styles.selectedTitle} numberOfLines={1}>
                    {selectedPost.title}
                  </ThemedText>
                </View>
              ) : contentId ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Currently selected episode isn’t in the results below — search to find it, or pick another.
                </ThemedText>
              ) : null}

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search episodes..."
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
              />

              {searching ? (
                <ActivityIndicator style={styles.loading} color={theme.primary} />
              ) : (
                <View style={[styles.episodeList, { borderColor: theme.border }]}>
                  {posts.map((post) => (
                    <EpisodeRow
                      key={post.id}
                      post={post}
                      selected={post.id === contentId}
                      onPress={() => setContentId(post.id)}
                    />
                  ))}
                  {posts.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
                      No episodes found.
                    </ThemedText>
                  ) : null}
                </View>
              )}
            </View>
          </>
        ) : null}

        <PrimaryButton title="Save" loading={submitting} disabled={!canSave} onPress={handleSave} />
      </ScrollView>
    </ThemedView>
  );
}

function EpisodeThumbnail({ post }: { post: Post }) {
  const theme = useTheme();
  return post.coverUrl ? (
    <Image source={{ uri: post.coverUrl }} style={styles.thumb} />
  ) : (
    <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.surface }]}>
      <Music size={16} color={theme.textMuted} />
    </View>
  );
}

function EpisodeRow({ post, selected, onPress }: { post: Post; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <SettingsRow
      icon={selected ? Music : Calendar}
      title={post.title}
      subtitle={post.publishAt ? new Date(post.publishAt).toLocaleDateString() : undefined}
      onPress={onPress}
      trailing={{ type: 'value', text: selected ? 'Selected' : '', tone: selected ? 'accent' : 'default' }}
    />
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
  section: {
    gap: Spacing.two,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.two,
  },
  selectedTitle: {
    flex: 1,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: RADII.control,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  episodeList: {
    borderWidth: 1,
    borderRadius: RADII.card,
    overflow: 'hidden',
  },
  emptyHint: {
    padding: Spacing.three,
  },
});
