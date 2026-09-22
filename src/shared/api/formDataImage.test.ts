import { Platform } from 'react-native';

import { appendImageFile, imageFilename } from '@/shared/api/formDataImage';

describe('imageFilename', () => {
  it('prefers the extension implied by the MIME type', () => {
    expect(imageFilename('avatar', 'file:///tmp/photo.HEIC', 'image/png')).toBe('avatar.png');
    expect(imageFilename('avatar', 'file:///tmp/photo', 'image/webp')).toBe('avatar.webp');
    expect(imageFilename('avatar', 'file:///tmp/photo', 'image/jpeg')).toBe('avatar.jpg');
  });

  it('falls back to the URI extension, stripped of any query string, when the MIME type is unmapped', () => {
    expect(imageFilename('avatar', 'https://x/photo.png?token=abc', null)).toBe('avatar.png');
    expect(imageFilename('avatar', 'https://x/photo.gif#frag', undefined)).toBe('avatar.gif');
  });

  it('falls back to jpg when there is no extension or it is implausibly long', () => {
    expect(imageFilename('avatar', 'https://x/photo-with-no-extension', undefined)).toBe('avatar.jpg');
    expect(imageFilename('avatar', 'https://x/file.averylongextension', undefined)).toBe('avatar.jpg');
  });

  it('lowercases a URI-derived extension', () => {
    expect(imageFilename('avatar', 'https://x/photo.JPG', undefined)).toBe('avatar.jpg');
  });
});

describe('appendImageFile', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('appends a Blob on web, fetched from the URI', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const blob = { size: 10 };
    global.fetch = jest.fn().mockResolvedValue({ blob: jest.fn().mockResolvedValue(blob) });
    const form = { append: jest.fn() } as unknown as FormData;

    await appendImageFile(form, 'file', { uri: 'blob:abc', filename: 'avatar.png' });

    expect(global.fetch).toHaveBeenCalledWith('blob:abc');
    expect(form.append).toHaveBeenCalledWith('file', blob, 'avatar.png');
  });

  it('appends the native {uri, name, type} shape on native, defaulting the mime type', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const form = { append: jest.fn() } as unknown as FormData;

    await appendImageFile(form, 'file', { uri: 'file:///tmp/a.jpg', filename: 'avatar.jpg' });

    expect(form.append).toHaveBeenCalledWith('file', {
      uri: 'file:///tmp/a.jpg',
      name: 'avatar.jpg',
      type: 'image/jpeg',
    });
  });

  it('uses the provided mime type on native when given', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const form = { append: jest.fn() } as unknown as FormData;

    await appendImageFile(form, 'file', { uri: 'file:///tmp/a.png', filename: 'avatar.png', mimeType: 'image/png' });

    expect(form.append).toHaveBeenCalledWith('file', {
      uri: 'file:///tmp/a.png',
      name: 'avatar.png',
      type: 'image/png',
    });
  });
});
