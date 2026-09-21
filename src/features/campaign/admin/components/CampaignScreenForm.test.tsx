import { render, screen, userEvent } from '@testing-library/react-native';

import { CampaignScreenForm } from '@/features/campaign/admin/components/CampaignScreenForm';
import type { CampaignScreen } from '@/features/campaign/types';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

const ImagePicker = jest.requireMock('expo-image-picker');

describe('CampaignScreenForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits sensible defaults with no interaction required', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={onSubmit} />);

    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: 3,
        layoutType: 'FULL_BACKGROUND',
        textAlignment: 'CENTER',
        titleSize: 'LARGE',
        descriptionSize: 'MEDIUM',
        closeEnabled: true,
        closeAfterSeconds: 1,
        actionType: 'NONE',
        actionLabel: undefined,
        actionTarget: undefined,
      }),
      undefined
    );
  });

  it('pre-fills fields from an initial screen for editing', async () => {
    const initial: CampaignScreen = {
      id: 's1',
      position: 1,
      durationSeconds: 8,
      backgroundColor: '#222222',
      title: 'Big Sale',
      description: 'Save today',
      textAlignment: 'LEFT',
      titleSize: 'SMALL',
      descriptionSize: 'SMALL',
      textColor: '#FFFFFF',
      overlayOpacity: 0.5,
      closeEnabled: false,
      actionType: 'NONE',
    } as CampaignScreen;

    await render(<CampaignScreenForm initial={initial} submitting={false} submitLabel="Save" onSubmit={jest.fn()} />);

    expect(screen.getByDisplayValue('8')).toBeTruthy();
    expect(screen.getByDisplayValue('#222222')).toBeTruthy();
    expect(screen.getByDisplayValue('Big Sale')).toBeTruthy();
    expect(screen.getByDisplayValue('Save today')).toBeTruthy();
    // closeEnabled false hides the closeAfterSeconds field entirely.
    expect(screen.queryByText('Close button appears after (seconds)')).toBeNull();
  });

  it('disables submit and shows an error when closeAfterSeconds is not less than duration', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={onSubmit} />);

    const closeAfterField = screen.getByDisplayValue('1');
    await user.clear(closeAfterField);
    await user.type(closeAfterField, '5');

    expect(await screen.findByText('0 ≤ Close button appears after (seconds) < Duration (seconds)')).toBeTruthy();

    await user.press(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a destination once an action type other than None is chosen', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={onSubmit} />);

    await user.press(screen.getByText('External link'));
    await user.press(screen.getByText('Save'));

    expect(await screen.findByText('A destination is required unless the call to action is “None”.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid external CTA target', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={onSubmit} />);

    await user.press(screen.getByText('External link'));
    await user.type(screen.getByPlaceholderText('https://…'), 'https://example.com');
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'EXTERNAL', actionTarget: 'https://example.com' }),
      undefined
    );
  });

  it('rejects an internal target outside the allow-list', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={onSubmit} />);

    await user.press(screen.getByText('In-app screen'));
    await user.type(screen.getByPlaceholderText('/podcasts/123'), '/not-allowed');
    await user.press(screen.getByText('Save'));

    expect(await screen.findByText('A destination is required unless the call to action is “None”.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('picks an image and passes it through to onSubmit', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://picked.jpg' }],
    });
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={onSubmit} />);

    await user.press(screen.getAllByText('Background image')[1]);
    expect(await screen.findByText('Edit')).toBeTruthy();

    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { uri: 'file://picked.jpg' });
  });

  it('does nothing when the image picker is cancelled', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true });
    const user = userEvent.setup();
    await render(<CampaignScreenForm submitting={false} submitLabel="Save" onSubmit={jest.fn()} />);

    await user.press(screen.getAllByText('Background image')[1]);

    expect(screen.queryByText('Edit')).toBeNull();
  });
});
