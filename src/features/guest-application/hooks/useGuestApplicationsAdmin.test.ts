import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useGuestApplicationsAdmin } from '@/features/guest-application/hooks/useGuestApplicationsAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PATCH: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPatch = bffClient.PATCH as jest.Mock;

describe('useGuestApplicationsAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listApplications passes the status filter and returns the applications array', async () => {
    mockGet.mockResolvedValueOnce({
      data: { applications: [{ id: '1' }], total: 1, page: 0, size: 100 },
      error: undefined,
      response: { status: 200 },
    });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    const applications = await result.current.listApplications('NEW');

    expect(applications).toEqual([{ id: '1' }]);
    expect(mockGet).toHaveBeenCalledWith('/api/admin/guest-applications', {
      params: { query: { status: 'NEW', page: 0, size: 100 } },
    });
  });

  it('listApplications defaults to an empty array when applications is absent', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    expect(await result.current.listApplications()).toEqual([]);
  });

  it('listApplications throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'nope' }, response: { status: 403 } });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    await expect(result.current.listApplications()).rejects.toThrow('nope');
  });

  it('getApplication passes the id and returns the application', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: '1', name: 'Jane' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    const application = await result.current.getApplication('1');

    expect(application.name).toBe('Jane');
    expect(mockGet).toHaveBeenCalledWith('/api/admin/guest-applications/{id}', { params: { path: { id: '1' } } });
  });

  it('getApplication throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'not found' }, response: { status: 404 } });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    await expect(result.current.getApplication('1')).rejects.toThrow('not found');
  });

  it('updateStatus patches the status and returns the updated application', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: '1', status: 'ACCEPTED' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    const updated = await result.current.updateStatus('1', 'ACCEPTED');

    expect(updated.status).toBe('ACCEPTED');
    expect(mockPatch).toHaveBeenCalledWith('/api/admin/guest-applications/{id}/status', {
      params: { path: { id: '1' } },
      body: { status: 'ACCEPTED' },
    });
  });

  it('updateStatus throws a BffError on failure', async () => {
    mockPatch.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    await expect(result.current.updateStatus('1', 'ACCEPTED')).rejects.toThrow('bad');
  });

  it('toggles submitting around a call', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    mockGet.mockReturnValueOnce(new Promise((resolve) => (resolveFn = resolve)));
    const { result } = await renderHook(() => useGuestApplicationsAdmin());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.getApplication('1');
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolveFn({ data: { id: '1' }, error: undefined, response: { status: 200 } });
    await promise;
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
