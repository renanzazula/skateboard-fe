import {
  MAX_REFRESH_PAGES,
  PAGE_SIZE,
  firstPageRequest,
  hasMorePosts,
  nextPageRequest,
  refreshRequest,
} from '@/features/podcast/services/feedPagination';

/** Items the BFF would return for a request, as an offset window. */
function window(request: { page: number; size: number }) {
  return { from: request.page * request.size, to: request.page * request.size + request.size };
}

describe('feedPagination', () => {
  it('asks for one PAGE_SIZE page at offset 0 first', () => {
    expect(firstPageRequest()).toEqual({ page: 0, size: PAGE_SIZE, lastPage: 0 });
    expect(window(firstPageRequest())).toEqual({ from: 0, to: PAGE_SIZE });
  });

  it('appends contiguous windows as pages are loaded', () => {
    let cursor = firstPageRequest().lastPage;
    const windows = [window(firstPageRequest())];
    for (let i = 0; i < 3; i += 1) {
      const request = nextPageRequest(cursor);
      windows.push(window(request));
      cursor = request.lastPage;
    }
    // No gaps and no overlap between consecutive pages.
    windows.forEach((w, i) => {
      if (i > 0) expect(w.from).toBe(windows[i - 1].to);
    });
    expect(windows.at(-1)).toEqual({ from: 3 * PAGE_SIZE, to: 4 * PAGE_SIZE });
    expect(cursor).toBe(3);
  });

  it('refreshes every loaded page in a single offset-0 request', () => {
    // Three pages loaded (cursor 2) → one request covering items 0..3*PAGE_SIZE.
    const request = refreshRequest(2);
    expect(request).toEqual({ page: 0, size: 3 * PAGE_SIZE, lastPage: 2 });
    expect(window(request)).toEqual({ from: 0, to: 3 * PAGE_SIZE });
  });

  it('resumes after a refresh with no gap and no duplicate', () => {
    const refreshed = refreshRequest(2);
    const next = nextPageRequest(refreshed.lastPage);
    // The refresh ended at item 18; the next page must start there.
    expect(window(refreshed).to).toBe(window(next).from);
    expect(next).toEqual({ page: 3, size: PAGE_SIZE, lastPage: 3 });
  });

  it('refreshes a single page as a single page', () => {
    expect(refreshRequest(0)).toEqual({ page: 0, size: PAGE_SIZE, lastPage: 0 });
  });

  it('caps a refresh at MAX_REFRESH_PAGES and reports the truncated cursor', () => {
    const request = refreshRequest(50);
    expect(request.size).toBe(MAX_REFRESH_PAGES * PAGE_SIZE);
    expect(request.lastPage).toBe(MAX_REFRESH_PAGES - 1);
    // The cursor still matches the list the refresh actually produced, so the
    // next page continues from its end rather than re-fetching what's shown.
    expect(nextPageRequest(request.lastPage).page).toBe(MAX_REFRESH_PAGES);
  });

  it('treats a negative/unset cursor as the first page', () => {
    expect(nextPageRequest(-1).page).toBe(0);
    expect(refreshRequest(-1)).toEqual({ page: 0, size: PAGE_SIZE, lastPage: 0 });
  });

  it('has more posts only while the loaded slice is short of the total', () => {
    expect(hasMorePosts(PAGE_SIZE, 20)).toBe(true);
    expect(hasMorePosts(20, 20)).toBe(false);
    expect(hasMorePosts(0, 0)).toBe(false);
  });
});
