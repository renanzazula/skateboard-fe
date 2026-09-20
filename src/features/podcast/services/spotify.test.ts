import { extractSpotifyInfo } from '@/features/podcast/services/spotify';

describe('extractSpotifyInfo', () => {
  it.each([
    ['track', 'https://open.spotify.com/track/abc123'],
    ['album', 'https://open.spotify.com/album/abc123'],
    ['playlist', 'https://open.spotify.com/playlist/abc123'],
    ['episode', 'https://open.spotify.com/episode/abc123'],
    ['show', 'https://open.spotify.com/show/abc123'],
  ] as const)('extracts a %s id', (type, url) => {
    expect(extractSpotifyInfo(url)).toEqual({ spotifyType: type, spotifyId: 'abc123' });
  });

  it('strips a query string from the id', () => {
    expect(extractSpotifyInfo('https://open.spotify.com/track/abc123?si=xyz')).toEqual({
      spotifyType: 'track',
      spotifyId: 'abc123',
    });
  });

  it('returns null for a non-Spotify URL', () => {
    expect(extractSpotifyInfo('https://example.com/track/abc123')).toBeNull();
  });

  it('returns null when the id is empty', () => {
    expect(extractSpotifyInfo('https://open.spotify.com/track/')).toBeNull();
  });
});
