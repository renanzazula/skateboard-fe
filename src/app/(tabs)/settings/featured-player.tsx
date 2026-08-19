import { Redirect } from 'expo-router';
import { Check, Music } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { CategoryChip } from '@/features/podcast/components/CategoryChip';
import type {
  FeaturedContentSource,
  HomePlayerPosition,
  PreferredPlaybackPlatform,
} from '@/features/home/hooks/useFeaturedPlayerAdmin';
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
  const { search, setSearch, posts, isLoading: searching, hasMore, loadMore } = useFeaturedContentPicker();

  const [enabled, setEnabled] = useState(false);
  const [contentId, setContentId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [position, setPosition] = useState<HomePlayerPosition>('BOTTOM');
  const [preferredPlatform, setPreferredPlatform] = useState<PreferredPlaybackPlatform | null>(null);
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
      setPreferredPlatform(config.preferredPlatform ?? null);
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
        preferredPlatform,
      });
      showAlert('Saved', 'Home Featured Player updated.');
    } catch (saveError) {
      showAlert('Could not save', isBffError(saveError) ? saveError.message : 'Try again.');
    }
  };

  const handleSelectEpisode = (post: Post) => {
    setContentId(post.id);
    // A stale preference from a previously-selected episode shouldn't carry
    // over silently — reset it and let the admin re-choose if this episode
    // also has both platforms.
    setPreferredPlatform(null);
  };

  const selectedHasSpotify = Boolean(selectedPost?.platforms?.some((p) => p.platform === 'SPOTIFY'));
  const selectedHasYoutube = Boolean(
    selectedPost?.platforms?.some((p) => p.platform === 'YOUTUBE') || selectedPost?.youtubeVideoId
  );
  const selectedHasBothPlatforms = selectedHasSpotify && selectedHasYoutube;

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
              <ThemedText type="small" themeColor="textSecondary">
                Pick any episode below. If it has a matched Spotify link (shown as a badge), the mini player
                uses Spotify automatically — otherwise it falls back to YouTube.
              </ThemedText>

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

              {selectedHasBothPlatforms ? (
                <View style={styles.section}>
                  <ThemedText type="small" themeColor="textSecondary">
                    This episode has both Spotify and YouTube. Choose which one to feature:
                  </ThemedText>
                  <View style={styles.modeRow}>
                    <CategoryChip
                      label="Auto (Spotify first)"
                      selected={preferredPlatform == null}
                      onPress={() => setPreferredPlatform(null)}
                    />
                    <CategoryChip
                      label="Spotify"
                      selected={preferredPlatform === 'SPOTIFY'}
                      onPress={() => setPreferredPlatform('SPOTIFY')}
                    />
                    <CategoryChip
                      label="YouTube"
                      selected={preferredPlatform === 'YOUTUBE'}
                      onPress={() => setPreferredPlatform('YOUTUBE')}
                    />
                  </View>
                </View>
              ) : null}

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search episodes..."
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
              />

              {searching && posts.length === 0 ? (
                <ActivityIndicator style={styles.loading} color={theme.primary} />
              ) : (
                <>
                  <View style={[styles.episodeList, { borderColor: theme.border }]}>
                    {posts.map((post) => (
                      <EpisodeRow
                        key={post.id}
                        post={post}
                        selected={post.id === contentId}
                        onPress={() => handleSelectEpisode(post)}
                      />
                    ))}
                    {posts.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
                        No episodes found.
                      </ThemedText>
                    ) : null}
                  </View>

                  {hasMore ? (
                    <Pressable
                      style={[styles.loadMoreButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                      onPress={loadMore}
                      disabled={searching}
                    >
                      {searching ? (
                        <ActivityIndicator color={theme.primary} />
                      ) : (
                        <Text style={[styles.loadMoreText, { color: theme.textPrimary }]}>Load more</Text>
                      )}
                    </Pressable>
                  ) : null}
                </>
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

// Shows which platform(s) the episode actually has a matched link for, so an
// admin looking to feature a Spotify-playable episode can tell at a glance —
// there's no separate "source" picker to choose Spotify vs YouTube with
// (playback.type is resolved automatically per-episode by the BFF, preferring
// Spotify when both exist; see PodcastFeaturedContentResolver).
function EpisodeRow({ post, selected, onPress }: { post: Post; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const hasSpotify = post.platforms?.some((p) => p.platform === 'SPOTIFY');
  const hasYoutube = post.platforms?.some((p) => p.platform === 'YOUTUBE') || Boolean(post.youtubeVideoId);

  return (
    <Pressable
      style={[styles.episodeRow, { borderColor: theme.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
    >
      <EpisodeThumbnail post={post} />
      <View style={styles.episodeRowText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {post.title}
        </ThemedText>
        <View style={styles.platformRow}>
          {post.publishAt ? (
            <ThemedText type="small" themeColor="textSecondary">
              {new Date(post.publishAt).toLocaleDateString()}
            </ThemedText>
          ) : null}
          {hasSpotify ? (
            <View style={[styles.platformPill, { borderColor: theme.spotify }]}>
              <Text style={[styles.platformPillText, { color: theme.spotify }]}>Spotify</Text>
            </View>
          ) : null}
          {hasYoutube ? (
            <View style={[styles.platformPill, { borderColor: theme.youtube }]}>
              <Text style={[styles.platformPillText, { color: theme.youtube }]}>YouTube</Text>
            </View>
          ) : null}
        </View>
      </View>
      {selected ? <Check size={18} color={theme.primary} /> : null}
    </Pressable>
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
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderBottomWidth: 1,
  },
  episodeRowText: {
    flex: 1,
    gap: 4,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  platformPill: {
    borderWidth: 1,
    borderRadius: RADII.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  platformPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyHint: {
    padding: Spacing.three,
  },
  loadMoreButton: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
