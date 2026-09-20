import { render, screen, userEvent } from '@testing-library/react-native';
import { openBrowserAsync } from 'expo-web-browser';

import { ExternalLink } from '@/shared/components/external-link';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue(undefined),
  WebBrowserPresentationStyle: { AUTOMATIC: 'AUTOMATIC' },
}));

const mockOpenBrowserAsync = openBrowserAsync as jest.Mock;

describe('ExternalLink', () => {
  const originalExpoOs = process.env.EXPO_OS;

  afterEach(() => {
    process.env.EXPO_OS = originalExpoOs;
    jest.clearAllMocks();
  });

  it('opens an in-app browser and prevents default navigation on native', async () => {
    process.env.EXPO_OS = 'ios';
    const user = userEvent.setup();
    await render(<ExternalLink href="https://example.com">Visit</ExternalLink>);

    await user.press(screen.getByText('Visit'));

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ presentationStyle: 'AUTOMATIC' })
    );
  });

  it('does not open an in-app browser on web (default link navigation applies)', async () => {
    process.env.EXPO_OS = 'web';
    const user = userEvent.setup();
    await render(<ExternalLink href="https://example.com">Visit</ExternalLink>);

    await user.press(screen.getByText('Visit'));

    expect(mockOpenBrowserAsync).not.toHaveBeenCalled();
  });
});
