import { render, screen, userEvent } from '@testing-library/react-native';

import PrivacyPolicyAdminScreen from '@/app/(tabs)/settings/privacy-policy-admin';
import { useAuth } from '@/core/auth';
import { usePrivacyPolicyAdmin } from '@/features/privacy-policy/hooks/usePrivacyPolicyAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/privacy-policy/hooks/usePrivacyPolicyAdmin', () => ({
  usePrivacyPolicyAdmin: jest.fn(),
}));

// PrivacyPolicyForm's editing internals belong to the Privacy Policy feature;
// this screen only cares that it receives the loaded page and that its
// onSubmit reaches savePrivacyPolicy.
jest.mock('@/features/privacy-policy/admin/components/PrivacyPolicyForm', () => ({
  PrivacyPolicyForm: ({ initialPage, submitting, onSubmit }: { initialPage: { title?: string } | null; submitting: boolean; onSubmit: (v: unknown) => void }) => {
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
const mockUsePrivacyPolicyAdmin = usePrivacyPolicyAdmin as jest.Mock;

describe('PrivacyPolicyAdminScreen', () => {
  const getPrivacyPolicy = jest.fn();
  const savePrivacyPolicy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePrivacyPolicyAdmin.mockReturnValue({ submitting: false, getPrivacyPolicy, savePrivacyPolicy });
  });

  it('redirects to settings when the user lacks FUNC_PRIVACY_POLICY_MANAGE', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    getPrivacyPolicy.mockResolvedValue({ title: 'Our policy' });

    await render(<PrivacyPolicyAdminScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
    expect(getPrivacyPolicy).not.toHaveBeenCalled();
  });

  it('shows a loading indicator, then the form once the page loads', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getPrivacyPolicy.mockResolvedValue({ title: 'Our policy' });

    await render(<PrivacyPolicyAdminScreen />);

    expect(await screen.findByText('form:Our policy')).toBeTruthy();
    expect(getPrivacyPolicy).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getPrivacyPolicy.mockRejectedValueOnce(new Error('network down'));

    await render(<PrivacyPolicyAdminScreen />);

    expect(await screen.findByText('Could not load the Privacy Policy page.')).toBeTruthy();
  });

  it('saves the page and shows a success alert on submit', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getPrivacyPolicy.mockResolvedValue({ title: 'Our policy' });
    savePrivacyPolicy.mockResolvedValueOnce({ title: 'New title' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<PrivacyPolicyAdminScreen />);
    await screen.findByText('form:Our policy');

    await user.press(screen.getByText('Submit form'));

    expect(savePrivacyPolicy).toHaveBeenCalledWith({ title: 'New title' });
    expect(await screen.findByText('form:New title')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Privacy Policy saved.', undefined);
  });

  it('shows an error alert when saving fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getPrivacyPolicy.mockResolvedValue({ title: 'Our policy' });
    savePrivacyPolicy.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<PrivacyPolicyAdminScreen />);
    await screen.findByText('form:Our policy');

    await user.press(screen.getByText('Submit form'));

    expect(await screen.findByText('form:Our policy')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not save the Privacy Policy', 'Try again.', undefined);
  });
});
