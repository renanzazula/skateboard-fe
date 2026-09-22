import { render, screen, userEvent } from '@testing-library/react-native';

import { ImageUploadDialog } from '@/shared/components/image-upload/ImageUploadDialog';
import { ImageSourceRejectedError } from '@/shared/components/image-upload/types';
import { useImageSource } from '@/shared/components/image-upload/useImageSource';

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('@/shared/components/image-upload/useImageSource', () => ({
  useImageSource: jest.fn(),
}));

let mockCropRect: { x: number; y: number; width: number; height: number } | null = { x: 0, y: 0, width: 10, height: 10 };
jest.mock('@/shared/components/image-upload/ImageCropper', () => {
  const { forwardRef: fwd, useImperativeHandle: useHandle } = require('react');
  const { View } = require('react-native');
  const ImageCropper = fwd((_props: unknown, ref: unknown) => {
    useHandle(ref, () => ({ getCropRect: () => mockCropRect }));
    return <View testID="image-cropper" />;
  });
  return { ImageCropper };
});

const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false, size: 1234 }),
}));

const mockUseImageSource = useImageSource as jest.Mock;

const ASSET = { uri: 'file://picked.jpg', width: 800, height: 600, mimeType: 'image/jpeg', fileSize: 500 };

function sourceHooks(overrides: Partial<ReturnType<typeof useImageSource>> = {}) {
  return {
    pickFromLibrary: jest.fn().mockResolvedValue(ASSET),
    pickFromCamera: jest.fn().mockResolvedValue(ASSET),
    ...overrides,
  };
}

describe('ImageUploadDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCropRect = { x: 0, y: 0, width: 10, height: 10 };
  });

  it('renders nothing meaningful and picks nothing while not visible', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    await render(<ImageUploadDialog visible={false} constraints={{}} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.queryByText('Choose from Library')).toBeNull();
  });

  it('picks from the library and, with no aspect ratio, goes straight to preview', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    await user.press(screen.getByText('Choose from Library'));

    expect(await screen.findByText('Use Photo')).toBeTruthy();
  });

  it('confirms the untouched asset when there is nothing to crop or resize', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={jest.fn()} onConfirm={onConfirm} />);

    await user.press(screen.getByText('Choose from Library'));
    await screen.findByText('Use Photo');
    await user.press(screen.getByText('Use Photo'));

    expect(onConfirm).toHaveBeenCalledWith({
      uri: 'file://picked.jpg',
      width: 800,
      height: 600,
      mimeType: 'image/jpeg',
      fileSizeBytes: 500,
    });
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('goes to the crop step when an aspect ratio constraint is set, then crops and resizes on confirm', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    const rendered = { width: 400, height: 400, saveAsync: jest.fn() };
    rendered.saveAsync.mockResolvedValue({ uri: 'file://cropped.jpg', width: 400, height: 400 });
    const context = { crop: jest.fn(), resize: jest.fn(), renderAsync: jest.fn() };
    context.crop.mockReturnValue(context);
    context.resize.mockReturnValue(context);
    context.renderAsync.mockResolvedValue(rendered);
    mockManipulate.mockReturnValue(context);
    const onConfirm = jest.fn();
    const user = userEvent.setup();

    await render(
      <ImageUploadDialog
        visible={true}
        constraints={{ aspectRatio: 1, outputWidth: 400, outputHeight: 400 }}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.press(screen.getByText('Choose from Library'));
    expect(await screen.findByTestId('image-cropper')).toBeTruthy();

    await user.press(screen.getByText('Use Photo'));

    expect(mockManipulate).toHaveBeenCalledWith('file://picked.jpg');
    expect(context.crop).toHaveBeenCalledWith(mockCropRect);
    expect(context.resize).toHaveBeenCalledWith({ width: 400, height: 400 });
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file://cropped.jpg', mimeType: 'image/jpeg', fileSizeBytes: 1234 })
    );
  });

  it('retake resets back to the source step', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    await user.press(screen.getByText('Choose from Library'));
    await screen.findByText('Use Photo');
    await user.press(screen.getByText('Retake'));

    expect(await screen.findByText('Choose from Library')).toBeTruthy();
  });

  it('cancel calls onCancel and resets state', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    const onCancel = jest.fn();
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={onCancel} onConfirm={jest.fn()} />);

    await user.press(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows a specific error message for a rejected image, then lets the user try again', async () => {
    mockUseImageSource.mockReturnValue(
      sourceHooks({ pickFromLibrary: jest.fn().mockRejectedValueOnce(new ImageSourceRejectedError('file_too_large')) })
    );
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    await user.press(screen.getByText('Choose from Library'));

    expect(await screen.findByText('That image is too large.')).toBeTruthy();

    await user.press(screen.getByText('Try Again'));
    expect(await screen.findByText('Choose from Library')).toBeTruthy();
  });

  it('falls back to a generic pick-error message for a plain thrown error with no message', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks({ pickFromLibrary: jest.fn().mockRejectedValueOnce('boom') }));
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    await user.press(screen.getByText('Choose from Library'));

    expect(await screen.findByText('Could not select an image.')).toBeTruthy();
  });

  it('picks from the camera', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    const user = userEvent.setup();
    await render(<ImageUploadDialog visible={true} constraints={{}} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    await user.press(screen.getByText('Take Photo'));

    expect(await screen.findByText('Use Photo')).toBeTruthy();
  });

  it('shows an error and allows retry when processing fails', async () => {
    mockUseImageSource.mockReturnValue(sourceHooks());
    mockManipulate.mockImplementation(() => {
      throw new Error('manipulation failed');
    });
    const user = userEvent.setup();

    await render(
      <ImageUploadDialog visible={true} constraints={{ aspectRatio: 1 }} onCancel={jest.fn()} onConfirm={jest.fn()} />
    );

    await user.press(screen.getByText('Choose from Library'));
    await screen.findByTestId('image-cropper');
    await user.press(screen.getByText('Use Photo'));

    expect(await screen.findByText('manipulation failed')).toBeTruthy();
  });
});
