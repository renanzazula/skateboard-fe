import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import { toCategory } from '@/features/podcast/hooks/toCategory';
import { toBffError } from '@/shared/api/errors';
import type { Category } from '@/shared/types/category';

interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
}

// README_YOUTUBE_PLAYLIST_CATEGORIES_MIGRATION.md §23: the FE never
// hardcodes a category list — it always reads GET /api/categories, then
// picks whichever the backend flagged `default` (falling back to the
// `podcasts` slug defensively, matching podcast-be's own fallback so the
// two agree even if that endpoint's fallback logic ever changes).
export function useCategories() {
  const [state, setState] = useState<CategoriesState>({ categories: [], isLoading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error, response } = await bffClient.GET('/api/categories');
    if (error) {
      setState({ categories: [], isLoading: false, error: toBffError(error, response.status) });
      return;
    }
    setState({ categories: (data ?? []).map(toCategory), isLoading: false, error: null });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const defaultCategory =
    state.categories.find((c) => c.isDefault) ??
    state.categories.find((c) => c.slug === 'podcasts') ??
    state.categories[0];

  return { categories: state.categories, defaultCategory, isLoading: state.isLoading, error: state.error, refresh: load };
}
