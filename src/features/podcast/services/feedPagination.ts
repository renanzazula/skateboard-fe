/**
 * Pure pagination math for the podcast feed, kept out of usePodcastFeed so it
 * can be unit tested under the plain jest-expo transform (see jest.config.js —
 * component/hook tests are not wired up, pure logic modules are).
 *
 * The BFF's `GET /api/categories/{slug}/posts` is offset-paged: it returns
 * items `[page * size, page * size + size)` of the category feed, ordered
 * `publishAt DESC NULLS LAST, id`. Everything below is expressed in that
 * contract's terms.
 */

/**
 * Items per feed request.
 *
 * Six rather than ten: every `PostResponse` in the page carries the post's
 * full `blocks` array and YouTube `description` even though EpisodeCard renders
 * neither (they can't be dropped from the response — episodeMeta's getters fall
 * back to `blocks` for manually-authored posts that predate the YouTube sync),
 * and each card immediately fetches a 1280x720 YouTube thumbnail. Both costs
 * scale with the page, so a smaller first page is a directly smaller wait
 * before the screen has something on it. Six still overfills a phone viewport
 * (cards are 16:9 full-bleed, ~2.5 per screen), so the list is never short
 * enough to look empty while the next page loads.
 */
export const PAGE_SIZE = 6;

/**
 * How many already-loaded pages a refresh re-fetches, at most.
 *
 * A refresh has to replace the list rather than append to it, so it must
 * re-request everything the user has scrolled through — otherwise regaining
 * focus silently throws their loaded pages away. That's unbounded in
 * principle, so it's capped: past this many pages a refresh keeps the first
 * `MAX_REFRESH_PAGES` and drops the rest, which the user can page back in.
 */
export const MAX_REFRESH_PAGES = 5;

export interface PageRequest {
  /** `page` query param — index in units of `size`. */
  page: number;
  /** `size` query param. */
  size: number;
  /** Index, in `PAGE_SIZE` units, of the last page this request covers. */
  lastPage: number;
}

/** The request for one more page appended after `lastLoadedPage`. */
export function nextPageRequest(lastLoadedPage: number): PageRequest {
  const page = Math.max(lastLoadedPage, -1) + 1;
  return { page, size: PAGE_SIZE, lastPage: page };
}

/** The request for the very first page of a category. */
export function firstPageRequest(): PageRequest {
  return { page: 0, size: PAGE_SIZE, lastPage: 0 };
}

/**
 * The request that re-reads everything loaded so far in **one** round trip:
 * offset 0, `size` covering every loaded page (capped at `MAX_REFRESH_PAGES`).
 *
 * Because offset stays 0 and `size` is a whole multiple of `PAGE_SIZE`, the
 * returned `lastPage` is still a valid `PAGE_SIZE`-unit cursor — the next
 * `nextPageRequest(lastPage)` resumes exactly where the refreshed list ends,
 * with no gap and no duplicate.
 */
export function refreshRequest(lastLoadedPage: number): PageRequest {
  const pages = Math.min(Math.max(lastLoadedPage, 0) + 1, MAX_REFRESH_PAGES);
  return { page: 0, size: pages * PAGE_SIZE, lastPage: pages - 1 };
}

/** `total` is the category's full published count, not the loaded slice. */
export function hasMorePosts(loadedCount: number, total: number): boolean {
  return loadedCount < total;
}
