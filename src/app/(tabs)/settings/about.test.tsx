import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import AboutScreen from '@/app/(tabs)/settings/about';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

const mockUseProfile = useProfile as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

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
    expect(screen.getByText('Open-source Licenses')).toBeTruthy();
    expect(screen.getByText('Contact & support')).toBeTruthy();
    expect(screen.getByText('Report a problem')).toBeTruthy();
  });

  it('navigates to the public Privacy Policy screen', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Privacy Policy'));
    expect(mockRouterPush).toHaveBeenCalledWith('/privacy-policy');
  });

  it('navigates to the Terms & Conditions screen', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Terms & Conditions'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings/terms');
  });

  it('navigates to the Open-source Licenses screen', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Open-source Licenses'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings/licenses');
  });

  it('opens the support modal from Contact & support', async () => {
    const user = userEvent.setup();
    await render(<AboutScreen />);

    await user.press(screen.getByText('Contact & support'));
    expect(await screen.findByText('Contact / Support')).toBeTruthy();
  });
});
