import { useCallback, useEffect, useState } from 'react';

import { bffClient } from '@/core/api/client';
import type { components } from '@/core/api/generated/schema';
import { toBffError } from '@/shared/api/errors';

export type NotificationPreferences = components['schemas']['NotificationPreferences'];

interface PreferencesState {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: Error | null;
}

/** GET/PATCH /api/me/preferences — same load/error shape as useProfile. */
export function useNotificationPreferences() {
  const [state, setState] = useState<PreferencesState>({ preferences: null, isLoading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error, response } = await bffClient.GET('/api/me/preferences');
    if (error) {
      setState({ preferences: null, isLoading: false, error: toBffError(error, response.status) });
      return;
    }
    setState({ preferences: data.notifications ?? null, isLoading: false, error: null });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(async (patch: Partial<NotificationPreferences>): Promise<void> => {
    const { data, error, response } = await bffClient.PATCH('/api/me/preferences', {
      body: { notifications: patch },
    });
    if (error) throw toBffError(error, response.status);
    setState((prev) => ({ ...prev, preferences: data.notifications ?? null }));
  }, []);

  return {
    preferences: state.preferences,
    isLoading: state.isLoading,
    error: state.error,
    setPushEnabled: (pushEnabled: boolean) => update({ pushEnabled }),
    setNewPodcastEnabled: (newPodcastEnabled: boolean) => update({ newPodcastEnabled }),
  };
}
