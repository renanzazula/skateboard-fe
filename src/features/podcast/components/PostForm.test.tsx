import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { PostForm } from '@/features/podcast/components/PostForm';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { testID?: string; mode?: string }) => <View testID={props.testID ?? `datetimepicker-${props.mode}`} {...props} />,
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const ImagePicker = jest.requireMock('expo-image-picker');

async function fillTitleAndCover(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Enter post title'), 'My Post');
  await user.type(screen.getByPlaceholderText('https://example.com/image.jpg'), 'https://x/cover.jpg');
}

describe('PostForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not submit while title or cover is empty', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} />);

    await user.press(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Enter post title'), 'My Post');
    await user.press(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation alert when there are no content blocks and no synced description', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} />);

    await fillTitleAndCover(user);
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'At least one content block is required', undefined);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with a synced description and no blocks', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(
      <PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} syncedDescription="Imported from YouTube" />
    );

    await fillTitleAndCover(user);
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Post', coverUrl: 'https://x/cover.jpg', blocks: [] })
    );
  });

  it('adds a text block, fills it in, and submits it', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} />);

    await fillTitleAndCover(user);
    await user.press(screen.getByText('+ Text'));
    expect(screen.getByText('Text content')).toBeTruthy();

    // Only the new block's textarea is still empty at this point.
    await user.type(screen.getAllByDisplayValue('')[0], 'Hello world');
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: expect.arrayContaining([expect.objectContaining({ type: 'text', data: { html: 'Hello world' } })]),
      })
    );
  });

  it('removes a content block', async () => {
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={jest.fn()} />);

    await user.press(screen.getByText('+ Text'));
    expect(screen.getByText('Text content')).toBeTruthy();

    await user.press(screen.getByText('✕'));

    expect(screen.queryByText('Text content')).toBeNull();
  });

  it('rejects an invalid social media link URL', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} syncedDescription="synced" />);

    await fillTitleAndCover(user);
    await user.press(screen.getByText('+ Add Social Link'));
    await user.type(screen.getByPlaceholderText('https://instagram.com/example'), 'not-a-url');
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Invalid URL. Must start with http:// or https://', undefined);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid social media link, trimmed', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} syncedDescription="synced" />);

    await fillTitleAndCover(user);
    await user.press(screen.getByText('+ Add Social Link'));
    await user.type(screen.getByPlaceholderText('https://instagram.com/example'), 'https://instagram.com/x');
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ socialMediaLinks: [{ url: 'https://instagram.com/x' }] })
    );
  });

  it('removes a social media link', async () => {
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={jest.fn()} />);

    await user.press(screen.getByText('+ Add Social Link'));
    expect(screen.getByPlaceholderText('https://instagram.com/example')).toBeTruthy();

    await user.press(screen.getByText('✕'));

    expect(screen.queryByPlaceholderText('https://instagram.com/example')).toBeNull();
  });

  it('switches to the upload cover source and picks an image', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ base64: 'abc123', mimeType: 'image/png' }],
    });
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={onSubmit} syncedDescription="synced" />);

    await user.type(screen.getByPlaceholderText('Enter post title'), 'My Post');
    await user.press(screen.getByText('Upload from device'));
    await user.press(screen.getAllByText('Upload from device')[1]);

    expect(await screen.findByText('Image selected ✓')).toBeTruthy();

    await user.press(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: 'data:image/png;base64,abc123' }));
  });

  it('does nothing when the image picker permission is denied', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const user = userEvent.setup();
    await render(<PostForm submitLabel="Save" submitting={false} onSubmit={jest.fn()} />);

    await user.press(screen.getByText('Upload from device'));
    await user.press(screen.getAllByText('Upload from device')[1]);

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('shows a saving label while submitting', async () => {
    await render(<PostForm submitLabel="Save" submitting={true} onSubmit={jest.fn()} />);

    expect(screen.getByText('Saving…')).toBeTruthy();
  });
});
