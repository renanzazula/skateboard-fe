import { render, screen, userEvent } from '@testing-library/react-native';

import TermsAdminScreen from '@/app/(tabs)/settings/terms-admin';
import { useAuth } from '@/core/auth';
import { useTermsAdmin } from '@/features/terms/hooks/useTermsAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/terms/hooks/useTermsAdmin', () => ({
  useTermsAdmin: jest.fn(),
}));

// TermsForm's editing internals belong to the Terms & Conditions feature;
// this screen only cares that it receives the loaded page and that its
// onSubmit reaches saveTerms.
jest.mock('@/features/terms/admin/components/TermsForm', () => ({
  TermsForm: ({ initialPage, submitting, onSubmit }: { initialPage: { title?: string } | null; submitting: boolean; onSubmit: (v: unknown) => void }) => {
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
const mockUseTermsAdmin = useTermsAdmin as jest.Mock;

describe('TermsAdminScreen', () => {
  const getTerms = jest.fn();
  const saveTerms = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTermsAdmin.mockReturnValue({ submitting: false, getTerms, saveTerms });
  });

  it('redirects to settings when the user lacks FUNC_TERMS_MANAGE', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    getTerms.mockResolvedValue({ title: 'Our terms' });

    await render(<TermsAdminScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
    expect(getTerms).not.toHaveBeenCalled();
  });

  it('shows a loading indicator, then the form once the page loads', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getTerms.mockResolvedValue({ title: 'Our terms' });

    await render(<TermsAdminScreen />);

    expect(await screen.findByText('form:Our terms')).toBeTruthy();
    expect(getTerms).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getTerms.mockRejectedValueOnce(new Error('network down'));

    await render(<TermsAdminScreen />);

    expect(await screen.findByText('Could not load the Terms & Conditions page.')).toBeTruthy();
  });

  it('saves the page and shows a success alert on submit', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getTerms.mockResolvedValue({ title: 'Our terms' });
    saveTerms.mockResolvedValueOnce({ title: 'New title' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<TermsAdminScreen />);
    await screen.findByText('form:Our terms');

    await user.press(screen.getByText('Submit form'));

    expect(saveTerms).toHaveBeenCalledWith({ title: 'New title' });
    expect(await screen.findByText('form:New title')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Terms & Conditions saved.', undefined);
  });

  it('shows an error alert when saving fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getTerms.mockResolvedValue({ title: 'Our terms' });
    saveTerms.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<TermsAdminScreen />);
    await screen.findByText('form:Our terms');

    await user.press(screen.getByText('Submit form'));

    expect(await screen.findByText('form:Our terms')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not save the Terms & Conditions', 'Try again.', undefined);
  });
});
