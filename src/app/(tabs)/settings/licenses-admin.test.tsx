import { render, screen, userEvent } from '@testing-library/react-native';

import LicensesAdminScreen from '@/app/(tabs)/settings/licenses-admin';
import { useAuth } from '@/core/auth';
import { useLicensesAdmin } from '@/features/licenses/hooks/useLicensesAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/licenses/hooks/useLicensesAdmin', () => ({
  useLicensesAdmin: jest.fn(),
}));

// LicensesForm's editing internals belong to the Open-source Licenses
// feature; this screen only cares that it receives the loaded page and that
// its onSubmit reaches saveLicenses.
jest.mock('@/features/licenses/admin/components/LicensesForm', () => ({
  LicensesForm: ({ initialPage, submitting, onSubmit }: { initialPage: { title?: string } | null; submitting: boolean; onSubmit: (v: unknown) => void }) => {
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
const mockUseLicensesAdmin = useLicensesAdmin as jest.Mock;

describe('LicensesAdminScreen', () => {
  const getLicenses = jest.fn();
  const saveLicenses = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLicensesAdmin.mockReturnValue({ submitting: false, getLicenses, saveLicenses });
  });

  it('redirects to settings when the user lacks FUNC_LICENSES_MANAGE', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    getLicenses.mockResolvedValue({ title: 'Our licenses' });

    await render(<LicensesAdminScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
    expect(getLicenses).not.toHaveBeenCalled();
  });

  it('shows a loading indicator, then the form once the page loads', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getLicenses.mockResolvedValue({ title: 'Our licenses' });

    await render(<LicensesAdminScreen />);

    expect(await screen.findByText('form:Our licenses')).toBeTruthy();
    expect(getLicenses).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getLicenses.mockRejectedValueOnce(new Error('network down'));

    await render(<LicensesAdminScreen />);

    expect(await screen.findByText('Could not load the Open-source Licenses page.')).toBeTruthy();
  });

  it('saves the page and shows a success alert on submit', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getLicenses.mockResolvedValue({ title: 'Our licenses' });
    saveLicenses.mockResolvedValueOnce({ title: 'New title' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<LicensesAdminScreen />);
    await screen.findByText('form:Our licenses');

    await user.press(screen.getByText('Submit form'));

    expect(saveLicenses).toHaveBeenCalledWith({ title: 'New title' });
    expect(await screen.findByText('form:New title')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Open-source Licenses saved.', undefined);
  });

  it('shows an error alert when saving fails', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    getLicenses.mockResolvedValue({ title: 'Our licenses' });
    saveLicenses.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const user = userEvent.setup();

    await render(<LicensesAdminScreen />);
    await screen.findByText('form:Our licenses');

    await user.press(screen.getByText('Submit form'));

    expect(await screen.findByText('form:Our licenses')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not save the Open-source Licenses', 'Try again.', undefined);
  });
});
