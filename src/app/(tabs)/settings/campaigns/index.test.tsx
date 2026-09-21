import { render, screen, userEvent } from '@testing-library/react-native';

import CampaignsListScreen from '@/app/(tabs)/settings/campaigns/index';
import { useAuth } from '@/core/auth';
import { useCampaignList } from '@/features/campaign/admin/hooks/useCampaignList';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { push: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/campaign/admin/hooks/useCampaignList', () => ({
  useCampaignList: jest.fn(),
}));

const { Redirect, router } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseCampaignList = useCampaignList as jest.Mock;

function state(overrides: Partial<ReturnType<typeof useCampaignList>> = {}) {
  return {
    campaigns: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe('CampaignsListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseCampaignList.mockReturnValue(state());

    await render(<CampaignsListScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows a loading indicator while loading', async () => {
    mockUseCampaignList.mockReturnValue(state({ loading: true }));
    await render(<CampaignsListScreen />);

    expect(screen.getByText('Startup Campaigns')).toBeTruthy();
  });

  it('shows an error banner with a working retry', async () => {
    const refetch = jest.fn();
    mockUseCampaignList.mockReturnValue(state({ error: new Error('offline'), refetch }));
    const user = userEvent.setup();
    await render(<CampaignsListScreen />);

    expect(screen.getByText('Could not load campaigns.')).toBeTruthy();

    await user.press(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there are no campaigns', async () => {
    mockUseCampaignList.mockReturnValue(state());
    await render(<CampaignsListScreen />);

    expect(screen.getByText('No campaigns yet.')).toBeTruthy();
  });

  it('lists campaigns and navigates to the editor on press', async () => {
    mockUseCampaignList.mockReturnValue(
      state({ campaigns: [{ id: 'c1', name: 'Summer Drop', priority: 2, status: 'DRAFT', screens: [{}, {}] }] })
    );
    const user = userEvent.setup();
    await render(<CampaignsListScreen />);

    expect(screen.getByText('Summer Drop')).toBeTruthy();
    expect(screen.getByText('Priority 2 · 2 screens')).toBeTruthy();

    await user.press(screen.getByText('Summer Drop'));
    expect(router.push).toHaveBeenCalledWith('/settings/campaigns/c1');
  });

  it('shows a new-campaign button only when the user can manage campaigns', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseCampaignList.mockReturnValue(state());
    const { rerender } = await render(<CampaignsListScreen />);
    // First render is unauthorized (redirect), so re-render with read-only access.
    mockUseAuth.mockReturnValue({
      hasAuthority: jest.fn((a: string) => a === 'FUNC_CAMPAIGN_READ'),
    });
    await rerender(<CampaignsListScreen />);

    expect(screen.queryByText('New campaign')).toBeNull();
  });

  it('navigates to the new-campaign screen when authorized to manage', async () => {
    mockUseCampaignList.mockReturnValue(state());
    const user = userEvent.setup();
    await render(<CampaignsListScreen />);

    await user.press(screen.getByText('New campaign'));

    expect(router.push).toHaveBeenCalledWith('/settings/campaigns/new');
  });
});
