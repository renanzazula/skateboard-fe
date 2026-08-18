// Home dashboard's video shape — a slim projection of Post, matching
// skateboard-ui-backend's HomeVideoResponse (see api/bff-openapi.yaml's
// "home" tag).

export type Video = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  // Intrinsic pixel size of thumbnailUrl, captured by podcast-be's YouTube
  // sync. Null when it was never captured — the gallery falls back to
  // deriving/probing the ratio (see features/home/hooks/useImageAspectRatio).
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  youtubeVideoId: string | null;
  category: string | null;
};
