import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), DELETE: jest.fn() },
}));

jest.mock('@/shared/api/formDataImage', () => ({
  appendImageFile: jest.fn().mockResolvedValue(undefined),
  imageFilename: jest.fn(() => 'campaign-screen.jpg'),
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPost = bffClient.POST as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;
const mockDelete = bffClient.DELETE as jest.Mock;

describe('useCampaignAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCampaign returns data and toggles submitting', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: '1' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    let value;
    await waitFor(async () => {
      value = await result.current.getCampaign('1');
    });

    expect(value).toEqual({ id: '1' });
    expect(mockGet).toHaveBeenCalledWith('/api/campaigns/admin/{campaignId}', { params: { path: { campaignId: '1' } } });
  });

  it('getCampaign throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'not found' }, response: { status: 404 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    await expect(result.current.getCampaign('missing')).rejects.toThrow('not found');
  });

  it('createCampaign posts and returns the created campaign', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'new' }, error: undefined, response: { status: 201 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    const created = await result.current.createCampaign({ name: 'X' } as never);

    expect(created).toEqual({ id: 'new' });
    expect(mockPost).toHaveBeenCalledWith('/api/campaigns/admin', { body: { name: 'X' } });
  });

  it('updateCampaign puts and returns the updated campaign', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: '1', name: 'Y' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    const updated = await result.current.updateCampaign('1', { name: 'Y' } as never);

    expect(updated).toEqual({ id: '1', name: 'Y' });
  });

  it('deleteCampaign calls DELETE and resolves on success', async () => {
    mockDelete.mockResolvedValueOnce({ error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    await expect(result.current.deleteCampaign('1')).resolves.toBeUndefined();
  });

  it('deleteCampaign throws on error', async () => {
    mockDelete.mockResolvedValueOnce({ error: { code: 'X', message: 'denied' }, response: { status: 403 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    await expect(result.current.deleteCampaign('1')).rejects.toThrow('denied');
  });

  it.each(['publish', 'pause', 'archive'] as const)('lifecycle(%s) calls the matching endpoint', async (action) => {
    mockPost.mockResolvedValueOnce({ data: { id: '1', status: action }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    await result.current.lifecycle('1', action);

    expect(mockPost).toHaveBeenCalledWith(`/api/campaigns/admin/{campaignId}/${action}`, { params: { path: { campaignId: '1' } } });
  });

  it('addScreen posts a new screen', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 's1' }, error: undefined, response: { status: 201 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    const screen = await result.current.addScreen('c1', { position: 0 } as never);

    expect(screen).toEqual({ id: 's1' });
  });

  it('updateScreen puts a screen update', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: 's1', position: 1 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    const screen = await result.current.updateScreen('c1', 's1', { position: 1 } as never);

    expect(screen).toEqual({ id: 's1', position: 1 });
  });

  it('removeScreen deletes a screen', async () => {
    mockDelete.mockResolvedValueOnce({ error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    await expect(result.current.removeScreen('c1', 's1')).resolves.toBeUndefined();
  });

  it('reorderScreens puts the new order', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: 'c1' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    await result.current.reorderScreens('c1', ['s2', 's1']);

    expect(mockPut).toHaveBeenCalledWith('/api/campaigns/admin/{campaignId}/screens/reorder', {
      params: { path: { campaignId: 'c1' } },
      body: { screenIds: ['s2', 's1'] },
    });
  });

  it('uploadScreenImage builds multipart form data and posts it', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 's1' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useCampaignAdmin());

    const asset = { uri: 'file://x.jpg', fileName: 'x.jpg', mimeType: 'image/jpeg' } as never;
    const screen = await result.current.uploadScreenImage('c1', 's1', asset, { x: 0.5, y: 0.5 });

    expect(screen).toEqual({ id: 's1' });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/campaigns/admin/{campaignId}/screens/{screenId}/image',
      expect.objectContaining({ params: { path: { campaignId: 'c1', screenId: 's1' } } })
    );
  });

  it('tracks submitting across a call', async () => {
    let resolvePost!: (v: unknown) => void;
    mockPost.mockReturnValueOnce(new Promise((resolve) => (resolvePost = resolve)));
    const { result } = await renderHook(() => useCampaignAdmin());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.createCampaign({} as never);
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolvePost({ data: { id: '1' }, error: undefined, response: { status: 201 } });
    await promise;

    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
