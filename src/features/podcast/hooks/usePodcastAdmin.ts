import { useCallback, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type CreatePostInput = components['schemas']['CreatePostRequest'];
export type UpdatePostInput = components['schemas']['UpdatePostRequest'];
export type ImportPostsInput = components['schemas']['ImportPostsRequest'];
export type ImportResult = components['schemas']['ImportResult'];
export type Post = components['schemas']['PostResponse'];
export type SyncResult = components['schemas']['SyncResultResponse'];

/** Admin mutations for the Podcast feature — create/edit/delete/import, each gated by its own FUNC_PODCAST_* authority at the call site. */
export function usePodcastAdmin() {
  const [submitting, setSubmitting] = useState(false);

  const createPost = useCallback(async (input: CreatePostInput): Promise<Post> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.POST('/api/podcast', { body: input });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updatePost = useCallback(async (id: string, input: UpdatePostInput): Promise<Post> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.PUT('/api/podcast/{id}', {
        params: { path: { id } },
        body: input,
      });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deletePost = useCallback(async (id: string): Promise<void> => {
    setSubmitting(true);
    try {
      const { error, response } = await bffClient.DELETE('/api/podcast/{id}', {
        params: { path: { id } },
      });
      if (error) throw toBffError(error, response.status);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const importPosts = useCallback(async (input: ImportPostsInput): Promise<ImportResult> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.POST('/api/podcast/import', { body: input });
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Triggers the same SynchronizeYoutubeChannelUseCase the backend scheduler
  // runs (README_YOUTUBE_PLAYLIST_CATEGORIES_MIGRATION.md §33) — replaces the
  // old JSON-file-paste import flow as the Podcast screen's "Import" action.
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    setSubmitting(true);
    try {
      const { data, error, response } = await bffClient.POST('/api/podcast/sync');
      if (error) throw toBffError(error, response.status);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, createPost, updatePost, deletePost, importPosts, triggerSync };
}
