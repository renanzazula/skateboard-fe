import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';

import { runCampaignCta } from '@/features/campaign/cta';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { AUTOMATIC: 'AUTOMATIC' },
}));

describe('runCampaignCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('does nothing when actionType is missing', async () => {
    await expect(runCampaignCta(undefined, '/home')).resolves.toBe(false);
  });

  it('does nothing when actionType is NONE', async () => {
    await expect(runCampaignCta('NONE', '/home')).resolves.toBe(false);
  });

  it('does nothing when actionTarget is missing', async () => {
    await expect(runCampaignCta('EXTERNAL', undefined)).resolves.toBe(false);
  });

  it('opens an absolute external URL', async () => {
    (openBrowserAsync as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(runCampaignCta('EXTERNAL', 'https://example.com')).resolves.toBe(true);
    expect(openBrowserAsync).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  it('rejects a non-absolute EXTERNAL target', async () => {
    await expect(runCampaignCta('EXTERNAL', '/relative')).resolves.toBe(false);
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it('still returns true when the browser fails to open', async () => {
    (openBrowserAsync as jest.Mock).mockRejectedValueOnce(new Error('failed'));
    await expect(runCampaignCta('EXTERNAL', 'https://example.com')).resolves.toBe(true);
  });

  it('navigates for an allow-listed INTERNAL target', async () => {
    await expect(runCampaignCta('INTERNAL', '/podcasts')).resolves.toBe(true);
    expect(router.push).toHaveBeenCalledWith('/podcast');
  });

  it('rejects an INTERNAL target outside the allow-list', async () => {
    await expect(runCampaignCta('INTERNAL', '/not-allowed')).resolves.toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('returns false for an unrecognized actionType', async () => {
    await expect(runCampaignCta('WEIRD', '/home')).resolves.toBe(false);
  });
});
