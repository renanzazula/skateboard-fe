import { useVideoPlayer, VideoView } from 'expo-video';
import { Platform, StyleSheet, View } from 'react-native';

// Loaded lazily so the web bundle never executes native-only modules — same
// pattern as PodcastEpisodeDetail's Spotify WebView.
let YoutubePlayer: any = null;
if (Platform.OS !== 'web') {
  YoutubePlayer = require('react-native-youtube-iframe').default;
}

type Props = {
  /** YouTube video id — takes precedence over `videoUrl` when both exist. */
  youtubeId: string | null;
  /** Direct video file URL (a `video` content block). */
  videoUrl: string | null;
  /** Poster shown by the file player before playback starts (web only). */
  poster?: string | null;
  height: number;
};

/**
 * The detail screen's hero video. The player is rendered as soon as the
 * screen opens — no thumbnail/overlay swap — so one tap on the player's own
 * play control starts playback. Keeping the initiating gesture inside the
 * player means browser/webview autoplay policies can never swallow it, which
 * is what made the old tap-then-autoplay hero unreliable.
 */
export function EpisodeVideoPlayer({ youtubeId, videoUrl, poster, height }: Props) {
  if (youtubeId) {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.container, { height }]}>
          {/* @ts-ignore web-only element */}
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </View>
      );
    }
    return (
      <View style={[styles.container, { height }]}>
        <YoutubePlayer height={height} videoId={youtubeId} />
      </View>
    );
  }

  if (videoUrl) {
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.container, { height }]}>
          {/* @ts-ignore web-only element */}
          <video
            src={videoUrl}
            poster={poster ?? undefined}
            controls
            playsInline
            style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          />
        </View>
      );
    }
    return <NativeFileVideo url={videoUrl} height={height} />;
  }

  return null;
}

// Separate component so the hook only runs when a file video is actually
// rendered (hooks can't sit behind the branches above).
function NativeFileVideo({ url, height }: { url: string; height: number }) {
  const player = useVideoPlayer(url);
  return (
    <View style={[styles.container, { height }]}>
      <VideoView
        player={player}
        style={styles.fill}
        contentFit="contain"
        nativeControls
        allowsPictureInPicture
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});
