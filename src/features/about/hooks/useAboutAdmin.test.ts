import { renderHook } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useAboutAdmin } from '@/features/about/hooks/useAboutAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PUT: jest.fn(), POST: jest.fn() },
}));

jest.mock('@/shared/api/formDataImage', () => ({
  appendImageFile: jest.fn().mockResolvedValue(undefined),
  imageFilename: jest.fn(() => 'about.jpg'),
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;
const mockPost = bffClient.POST as jest.Mock;

describe('useAboutAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAboutPage returns the mapped page', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: '1', title: 'About', blocks: [], status: 'DRAFT' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAboutAdmin());

    const page = await result.current.getAboutPage();
    expect(page?.title).toBe('About');
  });

  it('getAboutPage returns null on 204', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useAboutAdmin());

    await expect(result.current.getAboutPage()).resolves.toBeNull();
  });

  it('getAboutPage throws on error', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'denied' }, response: { status: 403 } });
    const { result } = await renderHook(() => useAboutAdmin());

    await expect(result.current.getAboutPage()).rejects.toThrow('denied');
  });

  it('saveAboutPage puts the input and returns the saved page', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: '1', title: 'New', blocks: [], status: 'PUBLISHED' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAboutAdmin());

    const saved = await result.current.saveAboutPage({ title: 'New', status: 'PUBLISHED' as never, blocks: [] });

    expect(saved.title).toBe('New');
    expect(mockPut).toHaveBeenCalledWith('/api/about-us', {
      body: { title: 'New', subtitle: null, status: 'PUBLISHED', blocks: [] },
    });
  });

  it('saveAboutPage throws on error', async () => {
    mockPut.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => useAboutAdmin());

    await expect(result.current.saveAboutPage({ title: 'x', status: 'DRAFT' as never, blocks: [] })).rejects.toThrow('bad');
  });

  it('uploadImage posts multipart form data and returns the url', async () => {
    mockPost.mockResolvedValueOnce({ data: { url: 'https://x/uploaded.jpg' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAboutAdmin());

    const asset = { uri: 'file://x.jpg', fileName: 'x.jpg', mimeType: 'image/jpeg' } as never;
    await expect(result.current.uploadImage(asset)).resolves.toBe('https://x/uploaded.jpg');
  });
});
