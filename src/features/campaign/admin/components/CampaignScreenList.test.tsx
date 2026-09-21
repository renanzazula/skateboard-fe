import { render, screen, userEvent } from '@testing-library/react-native';

import { CampaignScreenList } from '@/features/campaign/admin/components/CampaignScreenList';
import type { Campaign, CampaignScreen } from '@/features/campaign/types';

function screenAt(id: string, position: number, overrides: Partial<CampaignScreen> = {}): CampaignScreen {
  return {
    id,
    position,
    durationSeconds: 3,
    actionType: 'NONE',
    title: `Screen ${position}`,
    ...overrides,
  } as CampaignScreen;
}

function campaign(screens: CampaignScreen[]): Campaign {
  return { id: 'c1', name: 'X', screens } as Campaign;
}

describe('CampaignScreenList', () => {
  it('renders screens sorted by position with the count and total duration', async () => {
    const c = campaign([screenAt('s2', 2), screenAt('s1', 1)]);
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} onReorder={jest.fn()} />);

    expect(screen.getByText('2/3 · 6s')).toBeTruthy();
  });

  it('calls onEdit when a screen row is pressed', async () => {
    const onEdit = jest.fn();
    const s1 = screenAt('s1', 1);
    const c = campaign([s1]);
    const user = userEvent.setup();
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={jest.fn()} onEdit={onEdit} onRemove={jest.fn()} onReorder={jest.fn()} />);

    await user.press(screen.getByText('Screen 1'));

    expect(onEdit).toHaveBeenCalledWith(s1);
  });

  it('falls back to the position number when a screen has no title', async () => {
    const c = campaign([screenAt('s1', 1, { title: undefined })]);
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} onReorder={jest.fn()} />);

    expect(screen.getByText('#1')).toBeTruthy();
  });

  it('reorders screens by moving a row up or down', async () => {
    const onReorder = jest.fn();
    const c = campaign([screenAt('s1', 1), screenAt('s2', 2)]);
    const user = userEvent.setup();
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} onReorder={onReorder} />);

    await user.press(screen.getAllByText('↓')[0]);
    expect(onReorder).toHaveBeenCalledWith(['s2', 's1']);
  });

  it('removes a screen when its remove button is pressed', async () => {
    const onRemove = jest.fn();
    const s1 = screenAt('s1', 1);
    const c = campaign([s1]);
    const user = userEvent.setup();
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={jest.fn()} onEdit={jest.fn()} onRemove={onRemove} onReorder={jest.fn()} />);

    await user.press(screen.getByText('✕'));

    expect(onRemove).toHaveBeenCalledWith(s1);
  });

  it('hides reorder/remove controls and the add button when the user cannot manage', async () => {
    const c = campaign([screenAt('s1', 1)]);
    await render(<CampaignScreenList campaign={c} busy={false} canManage={false} onAdd={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} onReorder={jest.fn()} />);

    expect(screen.queryByText('✕')).toBeNull();
    expect(screen.queryByText('Add screen')).toBeNull();
  });

  it('hides the add button once the max number of screens is reached', async () => {
    const c = campaign([screenAt('s1', 1), screenAt('s2', 2), screenAt('s3', 3)]);
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} onReorder={jest.fn()} />);

    expect(screen.queryByText('Add screen')).toBeNull();
  });

  it('calls onAdd when the add-screen button is pressed', async () => {
    const onAdd = jest.fn();
    const c = campaign([]);
    const user = userEvent.setup();
    await render(<CampaignScreenList campaign={c} busy={false} canManage={true} onAdd={onAdd} onEdit={jest.fn()} onRemove={jest.fn()} onReorder={jest.fn()} />);

    await user.press(screen.getByText('Add screen'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
