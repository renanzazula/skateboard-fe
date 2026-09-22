import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import NewCampaignScreen from '@/app/(tabs)/settings/campaigns/new';
import { useAuth } from '@/core/auth';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { replace: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/campaign/admin/hooks/useCampaignAdmin', () => ({
  useCampaignAdmin: jest.fn(),
}));

const { Redirect, router } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseCampaignAdmin = useCampaignAdmin as jest.Mock;

describe('NewCampaignScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseCampaignAdmin.mockReturnValue({ submitting: false, createCampaign: jest.fn() });

    await render(<NewCampaignScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('creates the campaign and navigates to its editor', async () => {
    const createCampaign = jest.fn().mockResolvedValueOnce({ id: 'c1' });
    mockUseCampaignAdmin.mockReturnValue({ submitting: false, createCampaign });
    const user = userEvent.setup();
    await render(<NewCampaignScreen />);

    await user.type(screen.getAllByDisplayValue('')[0], 'Summer Drop');
    await user.press(screen.getByText('Save'));

    expect(createCampaign).toHaveBeenCalledWith(expect.objectContaining({ name: 'Summer Drop' }));
    expect(router.replace).toHaveBeenCalledWith('/settings/campaigns/c1');
  });

  it('shows an error alert when creation fails', async () => {
    const createCampaign = jest.fn().mockRejectedValueOnce(new Error('denied'));
    mockUseCampaignAdmin.mockReturnValue({ submitting: false, createCampaign });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<NewCampaignScreen />);

    await user.type(screen.getAllByDisplayValue('')[0], 'Summer Drop');
    await user.press(screen.getByText('Save'));

    // createCampaign only ever throws a BffError from a failed request or a
    // raw Error for something unexpected (e.g. network down) — the latter
    // intentionally shows the generic fallback rather than a raw message.
    expect(alertSpy).toHaveBeenCalledWith('Could not save the campaign', 'Try again.', undefined);
  });
});
