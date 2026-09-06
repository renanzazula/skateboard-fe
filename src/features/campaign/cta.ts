import { router } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

import { isAllowedInternalTarget, isExternalUrl, toAppRoute } from '@/features/campaign/ctaMatch';

export { isAllowedInternalTarget, isExternalUrl, toAppRoute };

/**
 * Runs a campaign screen's CTA. `actionType`/`actionTarget` are validated
 * server-side, but re-checked here (see ctaMatch.ts) rather than trusting the
 * payload straight into the navigator. Returns true if navigation actually
 * happened, so the caller can end the sequence.
 */
export async function runCampaignCta(actionType: string | undefined, actionTarget: string | undefined): Promise<boolean> {
  if (!actionType || actionType === 'NONE' || !actionTarget) return false;

  if (actionType === 'EXTERNAL') {
    if (!isExternalUrl(actionTarget)) {
      console.warn('[campaign] ignoring non-absolute EXTERNAL CTA target', actionTarget);
      return false;
    }
    try {
      await openBrowserAsync(actionTarget, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
    } catch (err) {
      console.warn('[campaign] EXTERNAL CTA failed to open', err);
    }
    return true;
  }

  if (actionType === 'INTERNAL') {
    if (!isAllowedInternalTarget(actionTarget)) {
      console.warn('[campaign] ignoring INTERNAL CTA target outside the allow-list', actionTarget);
      return false;
    }
    const route = toAppRoute(actionTarget);
    if (!route) {
      console.warn('[campaign] INTERNAL CTA target has no app route in V1', actionTarget);
      return false;
    }
    // The allow-list is validated above; expo-router's typed routes can't
    // express a route chosen at runtime, so widen to the accepted param type.
    router.push(route as Parameters<typeof router.push>[0]);
    return true;
  }

  return false;
}
