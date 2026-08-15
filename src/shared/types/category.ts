// Mirrors podcast-be's CategoryResponse — one entry per enabled YouTube
// playlist the channel exposes. Deliberately has no YouTube playlist id:
// the FE only ever addresses categories by `slug` (README_YOUTUBE_PLAYLIST_
// CATEGORIES_MIGRATION.md §14).
export type Category = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  isDefault: boolean;
  postCount: number;
};
