import * as ImagePicker from 'expo-image-picker';
import { renderHook } from '@testing-library/react-native';

import { useImageSource } from '@/shared/components/image-upload/useImageSource';
import { ImageSourceRejectedError, type ImageUploadConstraints } from '@/shared/components/image-upload/types';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const mockRequestMediaLibraryPermissionsAsync = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockRequestCameraPermissionsAsync = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.Mock;

function makeAsset(overrides: Partial<ImagePicker.ImagePickerAsset> = {}): ImagePicker.ImagePickerAsset {
  return {
    uri: 'file:///tmp/a.jpg',
    width: 800,
    height: 600,
    mimeType: 'image/jpeg',
    fileSize: 1000,
    ...overrides,
  } as ImagePicker.ImagePickerAsset;
}

async function setup(constraints: ImageUploadConstraints = {}) {
  const { result } = await renderHook(() => useImageSource(constraints));
  return result.current;
}

describe('useImageSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  });

  describe('pickFromLibrary', () => {
    it('throws when permission is not granted', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
      const { pickFromLibrary } = await setup();

      await expect(pickFromLibrary()).rejects.toThrow('Photo library permission is required to select an image.');
    });

    it('returns null when the user cancels', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true });
      const { pickFromLibrary } = await setup();

      await expect(pickFromLibrary()).resolves.toBeNull();
    });

    it('returns null when there are no assets', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [] });
      const { pickFromLibrary } = await setup();

      await expect(pickFromLibrary()).resolves.toBeNull();
    });

    it('returns the picked asset when it passes validation', async () => {
      const asset = makeAsset();
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromLibrary } = await setup();

      await expect(pickFromLibrary()).resolves.toBe(asset);
    });

    it('rejects an unsupported mime type', async () => {
      const asset = makeAsset({ mimeType: 'image/gif' });
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromLibrary } = await setup({ allowedTypes: ['image/png', 'image/jpeg'] });

      await expect(pickFromLibrary()).rejects.toMatchObject({ reason: 'unsupported_type' });
      await expect(pickFromLibrary()).rejects.toBeInstanceOf(ImageSourceRejectedError);
    });

    it('rejects a file that is too large', async () => {
      const asset = makeAsset({ fileSize: 5_000_000 });
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromLibrary } = await setup({ maxFileSizeBytes: 1_000_000 });

      await expect(pickFromLibrary()).rejects.toMatchObject({ reason: 'file_too_large' });
    });

    it('rejects an image whose resolution is too small', async () => {
      const asset = makeAsset({ width: 50, height: 50 });
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromLibrary } = await setup({ minWidth: 200, minHeight: 200 });

      await expect(pickFromLibrary()).rejects.toMatchObject({ reason: 'resolution_too_small' });
    });

    it('rejects an image whose resolution is too large', async () => {
      const asset = makeAsset({ width: 4000, height: 4000 });
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromLibrary } = await setup({ maxWidth: 2000, maxHeight: 2000 });

      await expect(pickFromLibrary()).rejects.toMatchObject({ reason: 'resolution_too_large' });
    });

    it('skips resolution validation when the asset reports no width/height', async () => {
      const asset = makeAsset({ width: 0, height: 0 });
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromLibrary } = await setup({ minWidth: 200, minHeight: 200 });

      await expect(pickFromLibrary()).resolves.toBe(asset);
    });
  });

  describe('pickFromCamera', () => {
    it('throws when permission is not granted', async () => {
      mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
      const { pickFromCamera } = await setup();

      await expect(pickFromCamera()).rejects.toThrow('Camera permission is required to take a photo.');
    });

    it('returns null when the user cancels', async () => {
      mockLaunchCameraAsync.mockResolvedValue({ canceled: true });
      const { pickFromCamera } = await setup();

      await expect(pickFromCamera()).resolves.toBeNull();
    });

    it('returns the captured asset when it passes validation', async () => {
      const asset = makeAsset();
      mockLaunchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset] });
      const { pickFromCamera } = await setup();

      await expect(pickFromCamera()).resolves.toBe(asset);
    });
  });
});
