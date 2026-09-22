jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'generated-uuid'),
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(undefined) },
}));

import * as Crypto from 'expo-crypto';

import { secureStorage } from '@/core/storage/secureStorage';
import { forgetCachedDeviceIdentifier, getDeviceIdentifier } from '@/features/notifications/deviceIdentifier';

const mockGetItem = secureStorage.getItem as jest.Mock;
const mockSetItem = secureStorage.setItem as jest.Mock;
const mockRandomUUID = Crypto.randomUUID as jest.Mock;

describe('deviceIdentifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    forgetCachedDeviceIdentifier();
  });

  it('returns the persisted id when one already exists', async () => {
    mockGetItem.mockResolvedValueOnce('existing-id');

    const id = await getDeviceIdentifier();

    expect(id).toBe('existing-id');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('generates and persists a new id when none exists', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockRandomUUID.mockReturnValueOnce('generated-uuid');

    const id = await getDeviceIdentifier();

    expect(id).toBe('generated-uuid');
    expect(mockSetItem).toHaveBeenCalledWith('skateboard.deviceId', 'generated-uuid');
  });

  it('caches the id in memory across calls, skipping storage on later reads', async () => {
    mockGetItem.mockResolvedValueOnce('existing-id');

    await getDeviceIdentifier();
    const second = await getDeviceIdentifier();

    expect(second).toBe('existing-id');
    expect(mockGetItem).toHaveBeenCalledTimes(1);
  });

  it('forgetCachedDeviceIdentifier clears the cache so the next call reads storage again', async () => {
    mockGetItem.mockResolvedValueOnce('existing-id');
    await getDeviceIdentifier();

    forgetCachedDeviceIdentifier();
    mockGetItem.mockResolvedValueOnce('rotated-id');
    const id = await getDeviceIdentifier();

    expect(id).toBe('rotated-id');
    expect(mockGetItem).toHaveBeenCalledTimes(2);
  });
});
