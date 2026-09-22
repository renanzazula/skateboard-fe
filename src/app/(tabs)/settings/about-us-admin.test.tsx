import { render, screen, userEvent } from '@testing-library/react-native';

import AboutUsAdminScreen from '@/app/(tabs)/settings/about-us-admin';
import { useAuth } from '@/core/auth';
import { useAboutAdmin } from '@/features/about/hooks/useAboutAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/about/hooks/useAboutAdmin', () => ({
  useAboutAdmin: jest.fn(),
}));

// AboutForm's block-editing internals belong to the About Us feature; this
// screen only cares that it receives the loaded page and that its onSubmit
// reaches saveAboutPage.
jest.mock('@/features/about/components/AboutForm', () => ({
  AboutForm: ({ initialPage, submitting, onSubmit }: { initialPage: { title?: string } | null; submitting: boolean; onSubmit: (v: unknown) => void }) => {
    const { Text, Pressable } = require('react-native');
    return (
      <>
        <Text>form:{initialPage ? initialPage.title : 'blank'}</Text>
        <Text>submitting:{String(submitting)}</Text>
        <Pressable onPress={() => onSubmit({ title: 'New title' })}>
          <Text>Submit form</Text>
        </Pressable>
      </>
    );
  },
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseAboutAdmin = useAboutAdmin as jest.Mock;

describe('AboutUsAdminScreen', () => {
  const getAboutPage = jest.fn();
  const saveAboutPage = jest.fn();
  const uploadImage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAboutAdmin.mockReturnValue({ submitting: false, getAboutPage, saveAboutPage, uploadImage });
  });

  it('redirects to settings when the user lacks FUNC_ABOUT_US_MANAGE', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    getAboutPage.mockResolvedValue({ title: 'Our story' });

    await render(<AboutUsAdminScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
    expect(getAboutPage).not.toHaveBeenCalled();
  });

  it('shows a loading indicator, then the form once the page loads', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getAboutPage.mockResolvedValue({ title: 'Our story' });

    await render(<AboutUsAdminScreen />);

    expect(await screen.findByText('form:Our story')).toBeTruthy();
    expect(getAboutPage).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getAboutPage.mockRejectedValueOnce(new Error('network down'));

    await render(<AboutUsAdminScreen />);

    expect(await screen.findByText('Could not load the About Us page.')).toBeTruthy();
  });

  it('saves the page and shows a success alert on submit', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getAboutPage.mockResolvedValue({ title: 'Our story' });
    saveAboutPage.mockResolvedValueOnce({ title: 'New title' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<AboutUsAdminScreen />);
    await screen.findByText('form:Our story');

    await user.press(screen.getByText('Submit form'));

    expect(saveAboutPage).toHaveBeenCalledWith({ title: 'New title' });
    expect(await screen.findByText('form:New title')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Success', 'About Us page saved.', undefined);
  });

  it('shows an error alert when saving fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getAboutPage.mockResolvedValue({ title: 'Our story' });
    saveAboutPage.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<AboutUsAdminScreen />);
    await screen.findByText('form:Our story');

    await user.press(screen.getByText('Submit form'));

    expect(await screen.findByText('form:Our story')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not save the About Us page', 'Try again.', undefined);
  });
});
