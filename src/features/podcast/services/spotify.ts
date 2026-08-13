// Extracted from rork-standard-app/expo's core/contexts/PostsContext.tsx —
// it lived inside that context there; this app has no such context to house
// it in, so it's a standalone util instead.
export function extractSpotifyInfo(
  url: string
): { spotifyType: 'track' | 'album' | 'playlist' | 'episode' | 'show'; spotifyId: string } | null {
  const patterns: Array<{ type: 'track' | 'album' | 'playlist' | 'episode' | 'show'; pattern: string }> = [
    { type: 'track', pattern: 'open.spotify.com/track/' },
    { type: 'album', pattern: 'open.spotify.com/album/' },
    { type: 'playlist', pattern: 'open.spotify.com/playlist/' },
    { type: 'episode', pattern: 'open.spotify.com/episode/' },
    { type: 'show', pattern: 'open.spotify.com/show/' },
  ];
  for (const { type, pattern } of patterns) {
    if (url.includes(pattern)) {
      const id = url.split(pattern)[1]?.split('?')[0] ?? '';
      if (id) return { spotifyType: type, spotifyId: id };
    }
  }
  return null;
}
