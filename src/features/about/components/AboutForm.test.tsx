import * as ImagePicker from 'expo-image-picker';
import { render, screen, userEvent } from '@testing-library/react-native';

import { AboutForm } from '@/features/about/components/AboutForm';
import { showAlert } from '@/shared/utils/alert';
import type { AboutPage } from '@/features/about/types';

jest.mock('@/shared/utils/alert', () => ({
  showAlert: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockShowAlert = showAlert as jest.Mock;

describe('AboutForm', () => {
  const onSubmit = jest.fn();
  const onUploadImage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects submission with an empty title', async () => {
    const user = userEvent.setup();
    await render(<AboutForm initialPage={null} submitting={false} onSubmit={onSubmit} onUploadImage={onUploadImage} />);

    const submit = screen.getAllByRole('button').find((b) => b.props.accessibilityState !== undefined);
    // The submit button is the PrimaryButton; find it by pressing the last button-like element.
    const buttons = screen.getAllByRole('button');
    await user.press(buttons[buttons.length - 1]);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalled();
    expect(submit).toBeDefined();
  });

  it('submits trimmed title/subtitle and the current blocks', async () => {
    const user = userEvent.setup();
    await render(<AboutForm initialPage={null} submitting={false} onSubmit={onSubmit} onUploadImage={onUploadImage} />);

    const titleInput = screen.getByPlaceholderText('About Us');
    await user.type(titleInput, '  My Title  ');

    const buttons = screen.getAllByRole('button');
    await user.press(buttons[buttons.length - 1]);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Title', subtitle: null, status: 'draft', blocks: [] })
    );
  });

  it('pre-fills fields from initialPage', async () => {
    const initialPage: AboutPage = {
      title: 'Existing',
      subtitle: 'Sub',
      status: 'published',
      blocks: [{ type: 'text', data: { html: 'hello' } }],
      updatedAt: null,
      updatedBy: null,
    };
    await render(<AboutForm initialPage={initialPage} submitting={false} onSubmit={onSubmit} onUploadImage={onUploadImage} />);

    expect(screen.getByDisplayValue('Existing')).toBeTruthy();
    expect(screen.getByDisplayValue('Sub')).toBeTruthy();
  });

  it('adds a block of each type when its add button is pressed', async () => {
    const user = userEvent.setup();
    await render(<AboutForm initialPage={null} submitting={false} onSubmit={onSubmit} onUploadImage={onUploadImage} />);

    const addButtons = screen.getAllByText(/^\+ /);
    await user.press(addButtons[0]); // hero
    await user.press(addButtons[1]); // text

    // Hero adds a headline field; text adds a content field.
    expect(screen.getByText('Headline (optional)')).toBeTruthy();
    expect(screen.getAllByText('Text content').length).toBeGreaterThan(0);
  });

  it('toggles to the preview tab', async () => {
    const user = userEvent.setup();
    await render(<AboutForm initialPage={null} submitting={false} onSubmit={onSubmit} onUploadImage={onUploadImage} />);

    await user.press(screen.getByText('Preview'));

    // In preview mode the edit-only "Page title" label is no longer shown.
    expect(screen.queryByText('Page title')).toBeNull();
  });

  it('shows an error alert when the image upload fails', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const user = userEvent.setup();
    await render(<AboutForm initialPage={null} submitting={false} onSubmit={onSubmit} onUploadImage={onUploadImage} />);

    await user.press(screen.getAllByText(/^\+ /)[0]); // add hero block
    await user.press(screen.getByText('Upload image'));

    expect(mockShowAlert).toHaveBeenCalled();
    expect(onUploadImage).not.toHaveBeenCalled();
  });
});
