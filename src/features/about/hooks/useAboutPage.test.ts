import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useAboutPage } from '@/features/about/hooks/useAboutPage';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;

describe('useAboutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and maps the page', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: '1', title: 'About', blocks: [], status: 'PUBLISHED' }, error: undefined, response: { status: 200 } });

    const { result } = await renderHook(() => useAboutPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.page?.title).toBe('About');
  });

  it('treats a 204 as no published page, not an error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 204 } });

    const { result } = await renderHook(() => useAboutPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.page).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces a BFF error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 500 } });

    const { result } = await renderHook(() => useAboutPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error?.message).toBe('bad');
  });

  it('surfaces a thrown network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useAboutPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error?.message).toBe('offline');
  });

  it('refetch reloads', async () => {
    mockGet.mockResolvedValue({ data: undefined, error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useAboutPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
