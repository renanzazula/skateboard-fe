import { Image } from 'expo-image';
import { renderHook, waitFor } from '@testing-library/react-native';

import { ratioFromUrl, useImageAspectRatio } from '@/features/home/hooks/useImageAspectRatio';

jest.mock('expo-image', () => ({
  Image: { loadAsync: jest.fn() },
}));

describe('ratioFromUrl', () => {
  it('derives the ratio from a maxresdefault YouTube thumbnail', () => {
    expect(ratioFromUrl('https://i.ytimg.com/vi/abc/maxresdefault.jpg')).toBeCloseTo(1280 / 720);
  });

  it('derives the ratio from an img.youtube.com hqdefault thumbnail', () => {
    expect(ratioFromUrl('https://img.youtube.com/vi/abc/hqdefault.jpg')).toBeCloseTo(480 / 360);
  });

  it('returns undefined for a non-YouTube URL', () => {
    expect(ratioFromUrl('https://example.com/image.png')).toBeUndefined();
  });
});

describe('useImageAspectRatio', () => {
  it('returns the known ratio synchronously without probing', async () => {
    const { result } = await renderHook(() => useImageAspectRatio('https://example.com/x.png', 2));
    expect(result.current).toBe(2);
    expect(Image.loadAsync).not.toHaveBeenCalled();
  });

  it('derives the ratio from a YouTube URL synchronously', async () => {
    const { result } = await renderHook(() => useImageAspectRatio('https://i.ytimg.com/vi/abc/hqdefault.jpg'));
    expect(result.current).toBeCloseTo(480 / 360);
    expect(Image.loadAsync).not.toHaveBeenCalled();
  });

  it('returns undefined for a null uri', async () => {
    const { result } = await renderHook(() => useImageAspectRatio(null));
    expect(result.current).toBeUndefined();
  });

  it('probes the image for a non-YouTube URL with no known ratio', async () => {
    (Image.loadAsync as jest.Mock).mockResolvedValueOnce({ width: 200, height: 100 });
    const { result } = await renderHook(() => useImageAspectRatio('https://example.com/probed-unique.png'));

    await waitFor(() => expect(result.current).toBe(2));
    expect(Image.loadAsync).toHaveBeenCalledWith('https://example.com/probed-unique.png', { maxWidth: 640 });
  });
});
