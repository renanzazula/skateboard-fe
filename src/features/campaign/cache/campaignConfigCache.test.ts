/* eslint-disable import/first -- jest.mock() must precede the imports it applies to */
const mockFiles = new Map<string, string>();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn((uri: string) => Promise.resolve({ exists: mockFiles.has(uri) })),
  readAsStringAsync: jest.fn((uri: string) => Promise.resolve(mockFiles.get(uri) ?? '')),
  writeAsStringAsync: jest.fn((uri: string, value: string) => {
    mockFiles.set(uri, value);
    return Promise.resolve();
  }),
  deleteAsync: jest.fn((uri: string) => {
    mockFiles.delete(uri);
    return Promise.resolve();
  }),
}));

import {
  clearCampaignConfigCache,
  readCampaignConfigCache,
  writeCampaignConfigCache,
} from '@/features/campaign/cache/campaignConfigCache';
import type { CampaignRuntime } from '@/features/campaign/types';

const URI = 'file:///docs/campaign-config-cache.json';
const campaign: CampaignRuntime = {
  id: 'c1',
  priority: 5,
  frequencyType: 'ALWAYS',
  screens: [{ id: 's1', position: 1 } as CampaignRuntime['screens'][number]],
};

beforeEach(() => mockFiles.clear());

describe('campaignConfigCache', () => {
  it('returns null when no cache file exists', async () => {
    expect(await readCampaignConfigCache()).toBeNull();
  });

  it('round-trips the campaign list with a fetchedAt timestamp', async () => {
    const before = Date.now();
    await writeCampaignConfigCache([campaign]);
    const cache = await readCampaignConfigCache();
    expect(cache?.campaigns).toEqual([campaign]);
    expect(cache?.fetchedAt).toBeGreaterThanOrEqual(before);
  });

  it('returns null for a corrupt file', async () => {
    mockFiles.set(URI, '{ broken');
    expect(await readCampaignConfigCache()).toBeNull();
  });

  it('returns null when the shape is wrong', async () => {
    mockFiles.set(URI, JSON.stringify({ fetchedAt: 'nope', campaigns: 'nope' }));
    expect(await readCampaignConfigCache()).toBeNull();
  });

  it('clears the cache file', async () => {
    await writeCampaignConfigCache([campaign]);
    await clearCampaignConfigCache();
    expect(await readCampaignConfigCache()).toBeNull();
  });
});