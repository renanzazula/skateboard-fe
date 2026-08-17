// Home dashboard's video shape — a slim projection of Post, matching
// skateboard-ui-backend's HomeVideoResponse (see api/bff-openapi.yaml's
// "home" tag).

export type Video = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  youtubeVideoId: string | null;
  category: string | null;
};
