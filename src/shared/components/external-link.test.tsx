import { render, screen, userEvent } from '@testing-library/react-native';
import { openBrowserAsync } from 'expo-web-browser';

import { ExternalLink } from '@/shared/components/external-link';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue(undefined),
  WebBrowserPresentationStyle: { AUTOMATIC: 'AUTOMATIC' },
}));

const mockOpenBrowserAsync = openBrowserAsync as jest.Mock;

describe('ExternalLink', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // process.env.EXPO_OS is inlined to a literal by babel-preset-expo at
  // transform time (see getInlinesFromOptions in babel-preset-expo), so it
  // can't be toggled at runtime in this test — the suite always runs under
  // whatever single platform jest-expo transforms for, which exercises the
  // "native" (non-web) branch below.
  it('opens an in-app browser and prevents default navigation', async () => {
    const user = userEvent.setup();
    await render(<ExternalLink href="https://example.com">Visit</ExternalLink>);

    await user.press(screen.getByText('Visit'));

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ presentationStyle: 'AUTOMATIC' })
    );
  });
});
