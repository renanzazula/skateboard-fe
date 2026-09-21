import { act, render, screen, userEvent } from '@testing-library/react-native';

import { CampaignScreenView } from '@/features/campaign/components/CampaignScreenView';
import type { CampaignScreen } from '@/features/campaign/types';

function makeScreen(overrides: Partial<CampaignScreen> = {}): CampaignScreen {
  return {
    id: 's1',
    position: 1,
    durationSeconds: 5,
    actionType: 'NONE',
    titleSize: 'MEDIUM',
    descriptionSize: 'SMALL',
    title: 'Big Sale',
    description: 'Everything must go',
    ...overrides,
  } as CampaignScreen;
}

describe('CampaignScreenView', () => {
  it('renders the title, description, and no CTA when actionType is NONE', async () => {
    await render(<CampaignScreenView screen={makeScreen()} onCtaPress={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Big Sale')).toBeTruthy();
    expect(screen.getByText('Everything must go')).toBeTruthy();
    expect(screen.queryByText('Learn more')).toBeNull();
  });

  it('shows a CTA button using the custom label when actionType is not NONE', async () => {
    const onCtaPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <CampaignScreenView
        screen={makeScreen({ actionType: 'EXTERNAL', actionLabel: 'Shop now' })}
        onCtaPress={onCtaPress}
        onClose={jest.fn()}
      />
    );

    await user.press(screen.getByText('Shop now'));

    expect(onCtaPress).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default CTA label when none is set', async () => {
    await render(
      <CampaignScreenView screen={makeScreen({ actionType: 'INTERNAL' })} onCtaPress={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.getByText('Learn more')).toBeTruthy();
  });

  it('shows the close button immediately when closeEnabled with a zero delay', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(
      <CampaignScreenView
        screen={makeScreen({ closeEnabled: true, closeAfterSeconds: 0 })}
        onCtaPress={jest.fn()}
        onClose={onClose}
      />
    );

    await user.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows no close button when closeEnabled is false', async () => {
    await render(
      <CampaignScreenView screen={makeScreen({ closeEnabled: false })} onCtaPress={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.queryByLabelText('Close')).toBeNull();
  });

  it('reveals the close button after the configured delay', async () => {
    jest.useFakeTimers();
    try {
      await render(
        <CampaignScreenView
          screen={makeScreen({ closeEnabled: true, closeAfterSeconds: 3 })}
          onCtaPress={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.queryByLabelText('Close')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByLabelText('Close')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
