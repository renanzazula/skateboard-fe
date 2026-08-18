import { PodcastPostScreen } from '@/features/podcast/components/PodcastPostScreen';

/**
 * Root-level twin of (tabs)/podcast/[slug].tsx, used only by Home's video
 * thumbnails. Home lives in its own tab, and Podcast's episode screen lives
 * on the Podcast tab's own nested stack — pushing that route directly from
 * Home switches tabs *and* pushes onto the Podcast tab's stack, so back()
 * would pop within the Podcast tab (landing on its list) instead of
 * returning to Home, and repeated visits pile up stale screens on that
 * stack. Routing here instead pushes onto the root stack, sitting above
 * (tabs) as a whole, so back() always returns to whichever tab was showing
 * — Home — with no leftover state in the Podcast tab.
 */
export default function VideoDetailScreen() {
  return <PodcastPostScreen />;
}
