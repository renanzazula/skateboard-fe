import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useAccountActions } from '@/features/account/hooks/useAccountActions';

jest.mock('@/core/api/client', () => ({
  bffClient: { POST: jest.fn(), DELETE: jest.fn() },
}));

jest.mock('@/shared/api/formDataImage', () => ({
  appendImageFile: jest.fn().mockResolvedValue(undefined),
  imageFilename: jest.fn(() => 'profile-picture.jpg'),
}));

const mockPost = bffClient.POST as jest.Mock;
const mockDelete = bffClient.DELETE as jest.Mock;

const PICKED_ASSET = { uri: 'file://x.jpg', mimeType: 'image/jpeg' } as never;

describe('useAccountActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('changeUsername posts the new username and returns the updated profile', async () => {
    mockPost.mockResolvedValueOnce({ data: { username: 'newname' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAccountActions());

    const profile = await result.current.changeUsername('newname');

    expect(profile).toEqual({ username: 'newname' });
    expect(mockPost).toHaveBeenCalledWith('/api/me/username', { body: { username: 'newname' } });
  });

  it('changeUsername throws a BffError on failure', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'taken' }, response: { status: 409 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.changeUsername('taken')).rejects.toThrow('taken');
  });

  it('uploadProfilePicture posts multipart form data and returns the profile', async () => {
    mockPost.mockResolvedValueOnce({ data: { username: 'skater8' }, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAccountActions());

    const profile = await result.current.uploadProfilePicture(PICKED_ASSET);

    expect(profile).toEqual({ username: 'skater8' });
    expect(mockPost).toHaveBeenCalledWith('/api/me/profile-picture', expect.objectContaining({ body: expect.anything() }));
  });

  it('uploadProfilePicture throws when the BFF returns no data despite no error', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.uploadProfilePicture(PICKED_ASSET)).rejects.toThrow();
  });

  it('changePassword posts the new password and resolves', async () => {
    mockPost.mockResolvedValueOnce({ error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.changePassword('newpass123')).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith('/api/me/change-password', { body: { newPassword: 'newpass123' } });
  });

  it('changePassword throws a BffError on failure', async () => {
    mockPost.mockResolvedValueOnce({ error: { code: 'X', message: 'weak password' }, response: { status: 400 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.changePassword('weak')).rejects.toThrow('weak password');
  });

  it('deactivateAccount posts and resolves', async () => {
    mockPost.mockResolvedValueOnce({ error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.deactivateAccount()).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith('/api/me/deactivate');
  });

  it('deleteAccount deletes and resolves', async () => {
    mockDelete.mockResolvedValueOnce({ error: undefined, response: { status: 204 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.deleteAccount()).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/me');
  });

  it('deleteAccount throws a BffError on failure', async () => {
    mockDelete.mockResolvedValueOnce({ error: { code: 'X', message: 'denied' }, response: { status: 403 } });
    const { result } = await renderHook(() => useAccountActions());

    await expect(result.current.deleteAccount()).rejects.toThrow('denied');
  });

  it('tracks submitting across a call', async () => {
    let resolvePost!: (v: unknown) => void;
    mockPost.mockReturnValueOnce(new Promise((resolve) => (resolvePost = resolve)));
    const { result } = await renderHook(() => useAccountActions());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.changeUsername('x');
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolvePost({ data: { username: 'x' }, error: undefined, response: { status: 200 } });
    await promise;

    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
