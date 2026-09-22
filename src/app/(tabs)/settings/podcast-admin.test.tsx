import { router } from 'expo-router';
import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import PodcastAdminScreen from '@/app/(tabs)/settings/podcast-admin';
import { useAuth } from '@/core/auth';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { push: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastAdmin', () => ({
  usePodcastAdmin: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUsePodcastAdmin = usePodcastAdmin as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

function mockAuth(authorities: string[]) {
  mockUseAuth.mockReturnValue({
    hasAuthority: jest.fn((authority: string) => authorities.includes(authority)),
  });
}

describe('PodcastAdminScreen', () => {
  const triggerSync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePodcastAdmin.mockReturnValue({ triggerSync, submitting: false });
  });

  it('redirects to settings when the user has neither authority', async () => {
    mockAuth([]);
    await render(<PodcastAdminScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows only the sync row for a sync-only admin', async () => {
    mockAuth(['FUNC_PODCAST_IMPORT_JSON']);
    await render(<PodcastAdminScreen />);

    expect(screen.getByText('Sync now')).toBeTruthy();
    expect(screen.queryByText('Manage categories')).toBeNull();
  });

  it('shows only the categories row for a categories-only admin', async () => {
    mockAuth(['FUNC_PODCAST_MANAGE_CATEGORIES']);
    await render(<PodcastAdminScreen />);

    expect(screen.queryByText('Sync now')).toBeNull();
    expect(screen.getByText('Manage categories')).toBeTruthy();
  });

  it('navigates to manage categories', async () => {
    mockAuth(['FUNC_PODCAST_MANAGE_CATEGORIES']);
    const user = userEvent.setup();
    await render(<PodcastAdminScreen />);

    await user.press(screen.getByText('Manage categories'));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/manage-categories');
  });

  it('triggers sync and shows a success alert with the created count', async () => {
    mockAuth(['FUNC_PODCAST_IMPORT_JSON']);
    triggerSync.mockResolvedValueOnce({ created: 4 });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<PodcastAdminScreen />);

    await user.press(screen.getByText('Sync now'));

    expect(triggerSync).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Success', '4 new episodes imported from YouTube', undefined);
  });

  it('shows an error alert when sync fails', async () => {
    mockAuth(['FUNC_PODCAST_IMPORT_JSON']);
    triggerSync.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<PodcastAdminScreen />);

    await user.press(screen.getByText('Sync now'));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Sync failed', undefined);
  });

  it('shows the syncing state and ignores presses while syncing', async () => {
    mockAuth(['FUNC_PODCAST_IMPORT_JSON']);
    mockUsePodcastAdmin.mockReturnValue({ triggerSync, submitting: true });
    const user = userEvent.setup();
    await render(<PodcastAdminScreen />);

    expect(screen.getByText('Syncing…')).toBeTruthy();
    await user.press(screen.getByText('Syncing…'));
    expect(triggerSync).not.toHaveBeenCalled();
  });
});
