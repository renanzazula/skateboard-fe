import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/core/auth';
import { LifecycleActions } from '@/features/campaign/admin/components/LifecycleActions';
import type { Campaign, CampaignStatus } from '@/features/campaign/types';

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

function campaign(status: CampaignStatus): Campaign {
  return { id: 'c1', name: 'X', status } as Campaign;
}

function handlers() {
  return { onPublish: jest.fn(), onPause: jest.fn(), onArchive: jest.fn(), onDelete: jest.fn() };
}

describe('LifecycleActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the user has no relevant authority', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });

    const { toJSON } = await render(<LifecycleActions campaign={campaign('DRAFT')} busy={false} {...handlers()} />);

    expect(toJSON()).toBeNull();
  });

  it('shows Publish and Delete for a DRAFT campaign when fully authorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    const fns = handlers();
    const user = userEvent.setup();

    await render(<LifecycleActions campaign={campaign('DRAFT')} busy={false} {...fns} />);

    expect(screen.getByText('Publish')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Archive')).toBeNull();

    await user.press(screen.getByText('Publish'));
    expect(fns.onPublish).toHaveBeenCalledTimes(1);

    await user.press(screen.getByText('Delete'));
    expect(fns.onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows Pause and Archive for an ACTIVE campaign', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    const fns = handlers();
    const user = userEvent.setup();

    await render(<LifecycleActions campaign={campaign('ACTIVE')} busy={false} {...fns} />);

    expect(screen.getByText('Pause')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.queryByText('Publish')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();

    await user.press(screen.getByText('Pause'));
    expect(fns.onPause).toHaveBeenCalledTimes(1);

    await user.press(screen.getByText('Archive'));
    expect(fns.onArchive).toHaveBeenCalledTimes(1);
  });

  it('shows Publish for a PAUSED campaign and Archive but not Delete', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });

    await render(<LifecycleActions campaign={campaign('PAUSED')} busy={false} {...handlers()} />);

    expect(screen.getByText('Publish')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('renders nothing for an ARCHIVED campaign even when authorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });

    const { toJSON } = await render(<LifecycleActions campaign={campaign('ARCHIVED')} busy={false} {...handlers()} />);

    expect(toJSON()).toBeNull();
  });

  it('only shows publish/pause/archive controls when the publish authority is granted, independent of manage', async () => {
    mockUseAuth.mockReturnValue({
      hasAuthority: jest.fn((authority: string) => authority === 'FUNC_CAMPAIGN_MANAGE'),
    });

    await render(<LifecycleActions campaign={campaign('DRAFT')} busy={false} {...handlers()} />);

    expect(screen.queryByText('Publish')).toBeNull();
    expect(screen.getByText('Delete')).toBeTruthy();
  });
});
