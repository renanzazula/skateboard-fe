import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useSubmitGuestApplication } from '@/features/guest-application/hooks/useSubmitGuestApplication';

jest.mock('@/core/api/client', () => ({
  bffClient: { POST: jest.fn() },
}));

const mockPost = bffClient.POST as jest.Mock;

describe('useSubmitGuestApplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits and returns the created application', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: '1', name: 'Jane', status: 'NEW' },
      error: undefined,
      response: { status: 201 },
    });
    const { result } = await renderHook(() => useSubmitGuestApplication());

    const created = await result.current.submit({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'I love skating',
      socialLinks: [],
    });

    expect(created.name).toBe('Jane');
    expect(mockPost).toHaveBeenCalledWith('/api/guest-applications', {
      body: { name: 'Jane', email: 'jane@example.com', message: 'I love skating', socialLinks: [] },
    });
  });

  it('toggles submitting around the call', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    mockPost.mockReturnValueOnce(new Promise((resolve) => (resolveFn = resolve)));
    const { result } = await renderHook(() => useSubmitGuestApplication());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.submit({ name: 'Jane', email: 'j@example.com', message: 'hi', socialLinks: [] });
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolveFn({ data: { id: '1' }, error: undefined, response: { status: 201 } });
    await promise;
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });

  it('throws a BffError on failure', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'conflict' }, response: { status: 409 } });
    const { result } = await renderHook(() => useSubmitGuestApplication());

    await expect(
      result.current.submit({ name: 'Jane', email: 'j@example.com', message: 'hi', socialLinks: [] })
    ).rejects.toThrow('conflict');
  });
});
