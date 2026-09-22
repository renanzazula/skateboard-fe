import { render, screen, userEvent } from '@testing-library/react-native';

import AboutScreen from '@/app/(tabs)/settings/about';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const mockUseProfile = useProfile as jest.Mock;

describe('AboutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
  });

  it('renders the app version, legal and support rows', async () => {
    await render(<AboutScreen />);

    expect(screen.getByText('App version')).toBeTruthy();
    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Open-source licenses')).toBeTruthy();
    expect(screen.getByText('Contact & support')).toBeTruthy();
    expect(screen.getByText('Report a problem')).toBeTruthy();
  });

  it('opens the terms modal with its body text and closes it again', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    expect(screen.queryByText(/pending final legal copy/)).toBeNull();

    await user.press(screen.getByText('Terms & Conditions'));
    expect(await screen.findByText(/pending final legal copy/)).toBeTruthy();

    await user.press(screen.getByText('Close'));
    expect(screen.queryByText(/pending final legal copy/)).toBeNull();
  });

  it('opens the privacy modal', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Privacy Policy'));
    expect(await screen.findByText(/final privacy policy is pending/)).toBeTruthy();
  });

  it('opens the licenses modal', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Open-source licenses'));
    expect(await screen.findByText(/Open-source license details/)).toBeTruthy();
  });

  it('opens the support modal from Contact & support', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Contact & support'));
    expect(await screen.findByText('Contact / Support')).toBeTruthy();
  });
});
