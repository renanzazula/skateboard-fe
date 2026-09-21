import { render, screen, userEvent } from '@testing-library/react-native';

import { CampaignScreenInspector } from '@/features/campaign/admin/components/CampaignScreenInspector';
import type { CampaignScreen } from '@/features/campaign/types';

function makeScreen(overrides: Partial<CampaignScreen> = {}): CampaignScreen {
  return {
    id: 's1',
    position: 1,
    durationSeconds: 4,
    actionType: 'NONE',
    title: 'Big Sale',
    description: 'Everything must go',
    ...overrides,
  } as CampaignScreen;
}

describe('CampaignScreenInspector', () => {
  it('renders nothing when there are no screens', async () => {
    const { toJSON } = await render(<CampaignScreenInspector screens={[]} />);

    expect(toJSON()).toBeNull();
  });

  it('renders the title, description, duration, and action type of the first screen', async () => {
    await render(<CampaignScreenInspector screens={[makeScreen()]} />);

    expect(screen.getByText('Big Sale')).toBeTruthy();
    expect(screen.getByText('Everything must go')).toBeTruthy();
    expect(screen.getByText('Duration (seconds): 4s · Call to action: NONE')).toBeTruthy();
  });

  it('appends the action target when one is set', async () => {
    await render(<CampaignScreenInspector screens={[makeScreen({ actionType: 'EXTERNAL', actionTarget: 'https://x.com' })]} />);

    expect(screen.getByText('Duration (seconds): 4s · Call to action: EXTERNAL → https://x.com')).toBeTruthy();
  });

  it('hides the screen switcher for a single screen and shows it for several', async () => {
    const { rerender } = await render(<CampaignScreenInspector screens={[makeScreen()]} />);
    expect(screen.queryByText('Screens')).toBeNull();

    await rerender(<CampaignScreenInspector screens={[makeScreen({ id: 's1', position: 1 }), makeScreen({ id: 's2', position: 2 })]} />);
    expect(screen.getByText('Screens')).toBeTruthy();
  });

  it('switches the previewed screen when a different chip is selected', async () => {
    const screens = [
      makeScreen({ id: 's1', position: 1, title: 'First' }),
      makeScreen({ id: 's2', position: 2, title: 'Second' }),
    ];
    const user = userEvent.setup();
    await render(<CampaignScreenInspector screens={screens} />);

    expect(screen.getByText('First')).toBeTruthy();

    await user.press(screen.getByText('#2'));

    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.queryByText('First')).toBeNull();
  });
});
