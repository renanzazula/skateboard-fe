import * as AuthSession from 'expo-auth-session';
import { render, screen, userEvent } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/index';
import { useAuth } from '@/core/auth';
import { useAppConfig } from '@/core/config';

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/core/config', () => ({
  useAppConfig: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseAppConfig = useAppConfig as jest.Mock;

function mockAppConfig(overrides: Partial<ReturnType<typeof useAppConfig>> = {}) {
  mockUseAppConfig.mockReturnValue({
    loginBackgroundUrl: null,
    loginTitle: null,
    loginMessage: null,
    ...overrides,
  });
}

describe('LoginScreen', () => {
  const loginWithPassword = jest.fn();
  const loginWithGoogle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ loginWithPassword, loginWithGoogle });
    mockAppConfig();
  });

  it('disables the log in button until both fields are filled', async () => {
    const user = userEvent.setup();
    await render(<LoginScreen />);

    const loginButton = screen.getByRole('button', { name: 'Log in' });
    expect(loginButton.props.accessibilityState?.disabled).toBe(true);

    await user.type(screen.getByPlaceholderText('Username or email'), 'skater');
    await user.type(screen.getByPlaceholderText('Password'), 'sk8-secret');

    expect(screen.getByRole('button', { name: 'Log in' }).props.accessibilityState?.disabled).toBe(false);
  });

  it('submits the trimmed username and password', async () => {
    loginWithPassword.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<LoginScreen />);

    await user.type(screen.getByPlaceholderText('Username or email'), '  skater  ');
    await user.type(screen.getByPlaceholderText('Password'), 'sk8-secret');
    await user.press(screen.getByRole('button', { name: 'Log in' }));

    expect(loginWithPassword).toHaveBeenCalledWith('skater', 'sk8-secret');
  });

  it('shows an invalid-credentials message when Keycloak rejects the login', async () => {
    loginWithPassword.mockRejectedValueOnce(
      new AuthSession.TokenError({ error: 'invalid_grant', error_description: 'bad creds' })
    );
    const user = userEvent.setup();
    await render(<LoginScreen />);

    await user.type(screen.getByPlaceholderText('Username or email'), 'skater');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong-password');
    await user.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid username or password.')).toBeTruthy();
  });

  it('shows a connection error for non-Keycloak failures', async () => {
    loginWithPassword.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    await render(<LoginScreen />);

    await user.type(screen.getByPlaceholderText('Username or email'), 'skater');
    await user.type(screen.getByPlaceholderText('Password'), 'sk8-secret');
    await user.press(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText("Could not connect. Check your connection and try again.")).toBeTruthy();
  });

  it('triggers Google sign-in from the secondary button', async () => {
    loginWithGoogle.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<LoginScreen />);

    await user.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('renders the tenant login title and message when app config provides them', async () => {
    mockAppConfig({ loginTitle: 'Skateboard Radio', loginMessage: 'Drop in and listen.' });
    await render(<LoginScreen />);

    expect(screen.getByText('Skateboard Radio')).toBeTruthy();
    expect(screen.getByText('Drop in and listen.')).toBeTruthy();
  });
});
