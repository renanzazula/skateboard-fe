import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { recordCampaignEvent } from '@/features/campaign/api/recordCampaignEvent';
import { runCampaignCta } from '@/features/campaign/cta';
import type { CampaignRuntime } from '@/features/campaign/types';
import { CampaignScreenView } from '@/features/campaign/components/CampaignScreenView';

type Props = {
  campaign: CampaignRuntime;
  /** Called once the sequence is over (finished, closed, or CTA-navigated away). */
  onDone: () => void;
  /** When true, analytics events are suppressed (admin preview). */
  preview?: boolean;
};

/**
 * Plays a campaign's ordered screens (spec §11): each screen shows for its
 * `durationSeconds`, then advances; the close button ends the whole sequence
 * (AC12), as does any CTA. The next screen's image is prefetched while the
 * current one plays (AC15), and the per-screen timer pauses while the app is
 * backgrounded. Screens are already sorted by `position` from the API.
 */
export function CampaignSequence({ campaign, onDone, preview = false }: Props) {
  const screens = campaign.screens ?? [];
  const [index, setIndex] = useState(0);
  const finished = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback(
    (eventType: Parameters<typeof recordCampaignEvent>[0]['eventType'], extra?: { screenId?: string; actionTarget?: string }) => {
      if (preview || !campaign.id) return;
      recordCampaignEvent({ campaignId: campaign.id, eventType, ...extra });
    },
    [campaign.id, preview]
  );

  const end = useCallback(
    (event?: 'CAMPAIGN_CLOSED' | 'CAMPAIGN_COMPLETED', screenId?: string) => {
      if (finished.current) return;
      finished.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (event) emit(event, { screenId });
      onDone();
    },
    [emit, onDone]
  );

  // Sequence start.
  useEffect(() => {
    if (screens.length === 0) {
      end();
      return;
    }
    emit('CAMPAIGN_STARTED');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = screens[index];

  // Per-screen timing + impression + preload-next. Pauses while backgrounded.
  useEffect(() => {
    if (!current || finished.current) return;
    emit('CAMPAIGN_SCREEN_IMPRESSION', { screenId: current.id });

    const next = screens[index + 1];
    if (next?.backgroundUrl) {
      Image.prefetch(next.backgroundUrl).catch(() => undefined);
    }

    let remainingMs = (current.durationSeconds ?? 3) * 1000;
    let startedAt = Date.now();

    const arm = () => {
      startedAt = Date.now();
      timerRef.current = setTimeout(() => {
        emit('CAMPAIGN_SCREEN_COMPLETED', { screenId: current.id });
        if (index + 1 >= screens.length) {
          end('CAMPAIGN_COMPLETED', current.id);
        } else {
          setIndex((i) => i + 1);
        }
      }, remainingMs);
    };

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        arm();
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
        remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
      }
    });

    if (AppState.currentState === 'active') arm();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      appStateSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  const handleCta = useCallback(async () => {
    if (!current) return;
    emit('CAMPAIGN_CTA_CLICKED', { screenId: current.id, actionTarget: current.actionTarget ?? undefined });
    const navigated = preview ? false : await runCampaignCta(current.actionType, current.actionTarget ?? undefined);
    // A CTA always leaves the campaign (AC12), whether or not it navigated.
    end(navigated ? undefined : 'CAMPAIGN_COMPLETED', current.id);
  }, [current, emit, end, preview]);

  const handleClose = useCallback(() => {
    emit('CAMPAIGN_SCREEN_SKIPPED', { screenId: current?.id });
    end('CAMPAIGN_CLOSED', current?.id);
  }, [current?.id, emit, end]);

  if (!current) return null;

  return (
    <View style={styles.root}>
      <CampaignScreenView screen={current} onCtaPress={handleCta} onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 900 },
});
