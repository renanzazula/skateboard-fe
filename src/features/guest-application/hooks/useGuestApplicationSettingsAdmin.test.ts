import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useGuestApplicationSettingsAdmin } from '@/features/guest-application/hooks/useGuestApplicationSettingsAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PUT: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;

describe('useGuestApplicationSettingsAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSettings returns the settings', async () => {
    mockGet.mockResolvedValueOnce({
      data: { enabled: true, recipientIds: [] },
      error: undefined,
      response: { status: 200 },
    });
    const { result } = await renderHook(() => useGuestApplicationSettingsAdmin());

    const settings = await result.current.getSettings();

    expect(settings.enabled).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('/api/guest-application-settings/admin');
  });

  it('getSettings throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'forbidden' }, response: { status: 403 } });
    const { result } = await renderHook(() => useGuestApplicationSettingsAdmin());

    await expect(result.current.getSettings()).rejects.toThrow('forbidden');
  });

  it('saveSettings puts the input and returns the saved settings', async () => {
    const input = { enabled: true, recipientIds: ['a'] };
    mockPut.mockResolvedValueOnce({ data: input, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useGuestApplicationSettingsAdmin());

    const saved = await result.current.saveSettings(input);

    expect(saved).toEqual(input);
    expect(mockPut).toHaveBeenCalledWith('/api/guest-application-settings/admin', { body: input });
  });

  it('saveSettings throws a BffError on failure', async () => {
    mockPut.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => useGuestApplicationSettingsAdmin());

    await expect(result.current.saveSettings({ enabled: false, recipientIds: [] })).rejects.toThrow('bad');
  });

  it('toggles submitting around a call', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    mockGet.mockReturnValueOnce(new Promise((resolve) => (resolveFn = resolve)));
    const { result } = await renderHook(() => useGuestApplicationSettingsAdmin());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.getSettings();
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolveFn({ data: { enabled: true, recipientIds: [] }, error: undefined, response: { status: 200 } });
    await promise;
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
