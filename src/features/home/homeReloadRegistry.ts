// Bridges (tabs)/_layout.tsx's tabPress listener to the mounted Home screen
// — the two are separate route files with no direct prop path between them,
// so a module-level singleton (same shape as core/auth/authStore.ts) stands
// in for the doc's `homeReloadRef` pattern (README_HOME_DASHBOARD.md §11).
let currentHandler: (() => void) | null = null;

/** Called by the Home screen on mount; returns an unregister function for cleanup. */
export function registerHomeReload(handler: () => void): () => void {
  currentHandler = handler;
  return () => {
    if (currentHandler === handler) currentHandler = null;
  };
}

/** Called by (tabs)/_layout.tsx when the Home tab is reselected. */
export function triggerHomeReload(): void {
  currentHandler?.();
}
