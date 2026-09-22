import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useBrandingAdmin } from '@/features/branding/hooks/useBrandingAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), DELETE: jest.fn() },
}));

jest.mock('@/shared/api/formDataImage', () => ({
  appendImageFile: jest.fn().mockResolvedValue(undefined),
  imageFilename: jest.fn(() => 'branding-asset.jpg'),
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPost = bffClient.POST as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;
const mockDelete = bffClient.DELETE as jest.Mock;

const ASSET = { uri: 'file://x.jpg', fileName: 'x.jpg', mimeType: 'image/jpeg' } as never;

describe('useBrandingAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getBrandingConfig returns data and toggles submitting', async () => {
    mockGet.mockResolvedValueOnce({ data: { loginTitle: 'Welcome' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    expect(result.current.submitting).toBe(false);
    const config = await result.current.getBrandingConfig();

    expect(config).toEqual({ loginTitle: 'Welcome' });
    expect(mockGet).toHaveBeenCalledWith('/api/config/branding');
  });

  it('getBrandingConfig throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'offline' }, response: { status: 500 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    await expect(result.current.getBrandingConfig()).rejects.toThrow('offline');
  });

  it('uploadLoginBackground posts multipart form data', async () => {
    mockPost.mockResolvedValueOnce({ data: { loginBackgroundUrl: 'https://x/bg.png' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const config = await result.current.uploadLoginBackground(ASSET);

    expect(config).toEqual({ loginBackgroundUrl: 'https://x/bg.png' });
    expect(mockPost).toHaveBeenCalledWith('/api/config/branding/login-background', expect.objectContaining({ body: expect.anything() }));
  });

  it('removeLoginBackground calls DELETE and returns the updated config', async () => {
    mockDelete.mockResolvedValueOnce({ data: { loginBackgroundUrl: null }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const config = await result.current.removeLoginBackground();

    expect(config).toEqual({ loginBackgroundUrl: null });
    expect(mockDelete).toHaveBeenCalledWith('/api/config/branding/login-background');
  });

  it('updateLoginText puts trimmed values, falling back to null', async () => {
    mockPut.mockResolvedValueOnce({ data: { loginTitle: 'Hi' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const config = await result.current.updateLoginText('Hi', '');

    expect(config).toEqual({ loginTitle: 'Hi' });
    expect(mockPut).toHaveBeenCalledWith('/api/config/branding/login-text', { body: { title: 'Hi', message: null } });
  });

  it('uploadAppLogo posts multipart form data', async () => {
    mockPost.mockResolvedValueOnce({ data: { appLogoUrl: 'https://x/logo.png' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const config = await result.current.uploadAppLogo(ASSET);

    expect(config).toEqual({ appLogoUrl: 'https://x/logo.png' });
    expect(mockPost).toHaveBeenCalledWith('/api/config/branding/app-logo', expect.objectContaining({ body: expect.anything() }));
  });

  it('removeAppLogo calls DELETE and returns the updated config', async () => {
    mockDelete.mockResolvedValueOnce({ data: { appLogoUrl: null }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const config = await result.current.removeAppLogo();

    expect(config).toEqual({ appLogoUrl: null });
    expect(mockDelete).toHaveBeenCalledWith('/api/config/branding/app-logo');
  });

  it('listBrandingAssets returns the asset list', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const assets = await result.current.listBrandingAssets();

    expect(assets).toEqual([{ id: 'a1' }]);
    expect(mockGet).toHaveBeenCalledWith('/api/config/branding/assets');
  });

  it('uploadBrandingAsset posts the name and file', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'a1', name: 'home-header' }, error: undefined, response: { status: 201 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const asset = await result.current.uploadBrandingAsset('home-header', ASSET);

    expect(asset).toEqual({ id: 'a1', name: 'home-header' });
    expect(mockPost).toHaveBeenCalledWith('/api/config/branding/assets', expect.objectContaining({ body: expect.anything() }));
  });

  it('replaceBrandingAsset puts the file for the given asset id', async () => {
    mockPut.mockResolvedValueOnce({ data: { id: 'a1', version: 2 }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    const asset = await result.current.replaceBrandingAsset('a1', ASSET);

    expect(asset).toEqual({ id: 'a1', version: 2 });
    expect(mockPut).toHaveBeenCalledWith(
      '/api/config/branding/assets/{assetId}',
      expect.objectContaining({ params: { path: { assetId: 'a1' } } })
    );
  });

  it('removeBrandingAsset deletes by asset id', async () => {
    mockDelete.mockResolvedValueOnce({ error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    await expect(result.current.removeBrandingAsset('a1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/config/branding/assets/{assetId}', { params: { path: { assetId: 'a1' } } });
  });

  it('removeBrandingAsset throws a BffError on failure', async () => {
    mockDelete.mockResolvedValueOnce({ error: { code: 'X', message: 'denied' }, response: { status: 403 } });
    const { result } = await renderHook(() => useBrandingAdmin());

    await expect(result.current.removeBrandingAsset('a1')).rejects.toThrow('denied');
  });

  it('tracks submitting across a call', async () => {
    let resolveGet!: (v: unknown) => void;
    mockGet.mockReturnValueOnce(new Promise((resolve) => (resolveGet = resolve)));
    const { result } = await renderHook(() => useBrandingAdmin());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.getBrandingConfig();
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolveGet({ data: {}, error: undefined, response: { status: 200 } });
    await promise;

    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
