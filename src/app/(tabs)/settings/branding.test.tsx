import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import BrandingScreen from '@/app/(tabs)/settings/branding';
import { useAuth } from '@/core/auth';
import { refreshAppConfig } from '@/core/config';
import { useBrandingAdmin } from '@/features/branding/hooks/useBrandingAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/core/config', () => ({
  refreshAppConfig: jest.fn(),
}));

jest.mock('@/features/branding/hooks/useBrandingAdmin', () => ({
  useBrandingAdmin: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseBrandingAdmin = useBrandingAdmin as jest.Mock;
const mockRequestPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

const CONFIG = {
  loginTitle: 'Welcome',
  loginMessage: 'Sign in to continue',
  loginBackgroundUrl: null,
  appLogoUrl: null,
  assets: [],
};

const PICKED_ASSET = { uri: 'file://picked.png' };

function admin(overrides: Partial<ReturnType<typeof useBrandingAdmin>> = {}) {
  return {
    submitting: false,
    getBrandingConfig: jest.fn().mockResolvedValue(CONFIG),
    updateLoginText: jest.fn(),
    uploadLoginBackground: jest.fn(),
    removeLoginBackground: jest.fn(),
    uploadAppLogo: jest.fn(),
    removeAppLogo: jest.fn(),
    uploadBrandingAsset: jest.fn(),
    replaceBrandingAsset: jest.fn(),
    removeBrandingAsset: jest.fn(),
    ...overrides,
  };
}

describe('BrandingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    mockRequestPermission.mockResolvedValue({ granted: true });
    mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [PICKED_ASSET] });
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseBrandingAdmin.mockReturnValue(admin());
    await render(<BrandingScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows a load error alert and keeps the screen usable', async () => {
    const brandingAdmin = admin({ getBrandingConfig: jest.fn().mockRejectedValueOnce(new Error('offline')) });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const alertSpy = jest.spyOn(Alert, 'alert');

    await render(<BrandingScreen />);

    expect(await screen.findByText('Login text')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not load branding', 'Try again.', undefined);
  });

  it('pre-fills the login title and message, and saves edits', async () => {
    const brandingAdmin = admin({ updateLoginText: jest.fn().mockResolvedValueOnce({ ...CONFIG, loginTitle: 'New title' }) });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByDisplayValue('Welcome');

    const titleInput = screen.getByDisplayValue('Welcome');
    await user.clear(titleInput);
    await user.type(titleInput, 'New title');
    await user.press(screen.getByText('Save'));

    expect(brandingAdmin.updateLoginText).toHaveBeenCalledWith('New title', 'Sign in to continue');
    expect(refreshAppConfig).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when saving login text fails', async () => {
    const brandingAdmin = admin({ updateLoginText: jest.fn().mockRejectedValueOnce(new Error('offline')) });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByDisplayValue('Welcome');
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Could not save login text', 'Try again.', undefined);
  });

  it('uploads a login background image and refreshes app config', async () => {
    const brandingAdmin = admin({
      uploadLoginBackground: jest.fn().mockResolvedValueOnce({ ...CONFIG, loginBackgroundUrl: 'https://x/bg.png' }),
    });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('Login background');

    await user.press(screen.getAllByText('Upload')[0]);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(brandingAdmin.uploadLoginBackground).toHaveBeenCalledWith(PICKED_ASSET);
    expect(refreshAppConfig).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Replace')).toBeTruthy();
  });

  it('shows an error alert when photo library permission is denied', async () => {
    mockRequestPermission.mockResolvedValueOnce({ granted: false });
    const brandingAdmin = admin();
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('Login background');

    await user.press(screen.getAllByText('Upload')[0]);

    expect(alertSpy).toHaveBeenCalledWith(
      'Could not update login background',
      'Photo library permission is required to update branding images.',
      undefined
    );
    expect(brandingAdmin.uploadLoginBackground).not.toHaveBeenCalled();
  });

  it('removes an existing login background', async () => {
    const brandingAdmin = admin({
      getBrandingConfig: jest.fn().mockResolvedValue({ ...CONFIG, loginBackgroundUrl: 'https://x/bg.png' }),
      removeLoginBackground: jest.fn().mockResolvedValueOnce(CONFIG),
    });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('Replace');

    await user.press(screen.getByText('Remove'));

    expect(brandingAdmin.removeLoginBackground).toHaveBeenCalledTimes(1);
    expect(refreshAppConfig).toHaveBeenCalledTimes(1);
  });

  it('uploads and removes the app logo', async () => {
    const brandingAdmin = admin({
      uploadAppLogo: jest.fn().mockResolvedValueOnce({ ...CONFIG, appLogoUrl: 'https://x/logo.png' }),
    });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('App logo');

    const uploadButtons = screen.getAllByText('Upload');
    await user.press(uploadButtons[1]);

    expect(brandingAdmin.uploadAppLogo).toHaveBeenCalledWith(PICKED_ASSET);
  });

  it('does nothing when the image picker is cancelled', async () => {
    mockLaunchLibrary.mockResolvedValueOnce({ canceled: true });
    const brandingAdmin = admin();
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('Login background');

    await user.press(screen.getAllByText('Upload')[0]);

    expect(brandingAdmin.uploadLoginBackground).not.toHaveBeenCalled();
  });

  it('adds a new branding asset through the name prompt', async () => {
    const brandingAdmin = admin({
      uploadBrandingAsset: jest.fn().mockResolvedValueOnce(undefined),
      getBrandingConfig: jest
        .fn()
        .mockResolvedValueOnce(CONFIG)
        .mockResolvedValueOnce({ ...CONFIG, assets: [{ id: 'a1', name: 'home-header', url: 'https://x/a.png', version: 1 }] }),
    });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('No branding assets yet.');

    await user.press(screen.getByTestId('add-branding-asset'));
    expect(await screen.findByText('Name this asset')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('e.g. home-header'), 'home-header');
    await user.press(screen.getByText('Add'));

    expect(brandingAdmin.uploadBrandingAsset).toHaveBeenCalledWith('home-header', PICKED_ASSET);
    expect(await screen.findByText('home-header')).toBeTruthy();
  });

  it('cancels the new asset prompt without uploading', async () => {
    const brandingAdmin = admin();
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('No branding assets yet.');

    await user.press(screen.getByTestId('add-branding-asset'));
    await user.press(screen.getByText('Cancel'));

    expect(screen.queryByText('Name this asset')).toBeNull();
    expect(brandingAdmin.uploadBrandingAsset).not.toHaveBeenCalled();
  });

  it('replaces and removes a branding asset', async () => {
    const brandingAdmin = admin({
      getBrandingConfig: jest.fn().mockResolvedValue({
        ...CONFIG,
        assets: [{ id: 'a1', name: 'home-header', url: 'https://x/a.png', version: 1 }],
      }),
      replaceBrandingAsset: jest.fn().mockResolvedValueOnce(undefined),
      removeBrandingAsset: jest.fn().mockResolvedValueOnce(undefined),
    });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('home-header');

    await user.press(screen.getByText('Replace'));
    expect(brandingAdmin.replaceBrandingAsset).toHaveBeenCalledWith('a1', PICKED_ASSET);

    await user.press(screen.getByTestId('remove-branding-asset-a1'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(brandingAdmin.removeBrandingAsset).toHaveBeenCalledWith('a1');
  });

  it('shows an error alert when removing an asset fails', async () => {
    const brandingAdmin = admin({
      getBrandingConfig: jest.fn().mockResolvedValue({
        ...CONFIG,
        assets: [{ id: 'a1', name: 'home-header', url: 'https://x/a.png', version: 1 }],
      }),
      removeBrandingAsset: jest.fn().mockRejectedValueOnce(new Error('offline')),
    });
    mockUseBrandingAdmin.mockReturnValue(brandingAdmin);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<BrandingScreen />);
    await screen.findByText('home-header');

    await user.press(screen.getByTestId('remove-branding-asset-a1'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(alertSpy).toHaveBeenLastCalledWith('Could not remove branding asset', 'Try again.', undefined);
  });
});
