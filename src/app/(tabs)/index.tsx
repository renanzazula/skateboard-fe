import { useRouter } from 'expo-router';
import { Mic } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth';
import { useProfile } from '@/features/account/hooks/useProfile';
import { EpisodeCard } from '@/features/podcast/components/EpisodeCard';
import { usePodcastFeed } from '@/features/podcast/hooks/usePodcastFeed';
import { getEpisodeNumber } from '@/features/podcast/services/episodeMeta';
import { EmptyState } from '@/shared/components/EmptyState';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';

export default function HomeScreen() {
  const { authorities } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  const canSeePodcast = authorities.includes('FUNC_TAB_PODCAST');
  const { posts, total, isLoading } = usePodcastFeed();
  const latestPost = posts[0] ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              Welcome back
            </ThemedText>
            <ThemedText type="title" style={styles.wordmark}>
              {profile?.displayName || 'Skateboard'}
            </ThemedText>
          </View>

          {canSeePodcast ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Latest episode
                </ThemedText>
                {total > 0 ? (
                  <Pressable onPress={() => router.push('/podcast')} hitSlop={8}>
                    <ThemedText type="linkPrimary">View all</ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {latestPost ? (
                <EpisodeCard
                  post={latestPost}
                  episodeNumber={getEpisodeNumber(latestPost) ?? total}
                  onPress={() => router.push(`/podcast/${latestPost.slug}`)}
                />
              ) : !isLoading ? (
                <EmptyState
                  icon={Mic}
                  title="No episodes yet"
                  description="New episodes will show up here when they're published."
                />
              ) : null}
            </View>
          ) : (
            <ThemedText type="default" themeColor="textSecondary">
              You&apos;re signed in.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.half,
  },
  wordmark: {
    fontSize: 34,
    lineHeight: 38,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
});
