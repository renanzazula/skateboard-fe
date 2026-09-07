import { useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/core/auth';
import { env } from '@/core/config/env';
import { CampaignSequence } from '@/features/campaign/components/CampaignSequence';
import { useCampaignResolver } from '@/features/campaign/hooks/useCampaignResolver';

/**
 * Sits between the animated splash and the app's first real screen (spec §11).
 * When a campaign is eligible it renders {@link CampaignSequence} as a
 * full-screen overlay above `children` (the router stack), so the stack is
 * mounted but neither visible nor interactive until the sequence ends. When
 * nothing is eligible — or the feature is off, or resolving failed/timed out —
 * `children` shows through unchanged.
 *
 * The resolver only runs once auth state is known, so an AUTHENTICATED-audience
 * campaign is never shown to a session that turns out to be signed out.
 */
export function CampaignGate({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const authResolved = status !== 'loading';
  const enabled = env.campaignsEnabled && authResolved;

  const { phase, campaign, markShown } = useCampaignResolver(enabled);
  const [sequenceDone, setSequenceDone] = useState(false);

  const showCampaign = enabled && phase === 'ready' && campaign != null && campaign.id != null && !sequenceDone;

  return (
    <>
      {children}
      {showCampaign ? (
        <CampaignSequence
          campaign={campaign}
          onDone={() => {
            markShown(campaign.id!);
            setSequenceDone(true);
          }}
        />
      ) : null}
    </>
  );
}
