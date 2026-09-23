import { AppState } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { recordCampaignEvent } from '@/features/campaign/api/recordCampaignEvent';
import { runCampaignCta } from '@/features/campaign/cta';
import { CampaignSequence } from '@/features/campaign/components/CampaignSequence';
import type { CampaignRuntime } from '@/features/campaign/types';

jest.mock('@/features/campaign/api/recordCampaignEvent', () => ({
  recordCampaignEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/campaign/cta', () => ({
  runCampaignCta: jest.fn(),
}));

jest.mock('@/features/campaign/components/CampaignScreenView', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    CampaignScreenView: ({
      screen,
      onCtaPress,
      onClose,
      onImageError,
    }: {
      screen: { title: string };
      onCtaPress: () => void;
      onClose: () => void;
      onImageError: () => void;
    }) => (
      <View>
        <Text>{screen.title}</Text>
        <Pressable onPress={onCtaPress}>
          <Text>cta</Text>
        </Pressable>
        <Pressable onPress={onClose}>
          <Text>close</Text>
        </Pressable>
        <Pressable onPress={onImageError}>
          <Text>image-error</Text>
        </Pressable>
      </View>
    ),
  };
});

const mockRecordEvent = recordCampaignEvent as jest.Mock;
const mockRunCta = runCampaignCta as jest.Mock;

function campaign(overrides: Partial<CampaignRuntime> = {}): CampaignRuntime {
  return {
    id: 'c1',
    priority: 1,
    frequencyType: 'ALWAYS',
    screens: [
      { id: 's1', position: 1, title: 'First', durationSeconds: 2, actionType: 'NONE' },
      { id: 's2', position: 2, title: 'Second', durationSeconds: 3, actionType: 'NONE' },
    ],
    ...overrides,
  } as CampaignRuntime;
}

describe('CampaignSequence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  });

  it('ends immediately with no events when there are no screens', async () => {
    const onDone = jest.fn();
    await render(<CampaignSequence campaign={campaign({ screens: [] })} onDone={onDone} />);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it('emits CAMPAIGN_STARTED and the first screen impression on mount', async () => {
    await render(<CampaignSequence campaign={campaign()} onDone={jest.fn()} />);

    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_STARTED' });
    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_SCREEN_IMPRESSION', screenId: 's1' });
    expect(screen.getByText('First')).toBeTruthy();
  });

  it('suppresses analytics events in preview mode', async () => {
    await render(<CampaignSequence campaign={campaign()} onDone={jest.fn()} preview />);

    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it('advances to the next screen after its duration elapses', async () => {
    jest.useFakeTimers();
    try {
      await render(<CampaignSequence campaign={campaign()} onDone={jest.fn()} />);
      expect(screen.getByText('First')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Second')).toBeTruthy();
      expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_SCREEN_COMPLETED', screenId: 's1' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('ends the sequence with CAMPAIGN_COMPLETED after the last screen finishes', async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    try {
      await render(<CampaignSequence campaign={campaign({ screens: [{ id: 's1', position: 1, title: 'Only', durationSeconds: 1, actionType: 'NONE' } as never] })} onDone={onDone} />);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(onDone).toHaveBeenCalledTimes(1);
      expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_COMPLETED', screenId: 's1' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('closing emits CAMPAIGN_SCREEN_SKIPPED and CAMPAIGN_CLOSED, then calls onDone', async () => {
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignSequence campaign={campaign()} onDone={onDone} />);

    await user.press(screen.getByText('close'));

    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_SCREEN_SKIPPED', screenId: 's1' });
    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_CLOSED', screenId: 's1' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('pressing the CTA runs it and ends without CAMPAIGN_COMPLETED when it navigated away', async () => {
    mockRunCta.mockResolvedValueOnce(true);
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignSequence campaign={campaign()} onDone={onDone} />);

    await user.press(screen.getByText('cta'));

    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_CTA_CLICKED', screenId: 's1', actionTarget: undefined });
    expect(mockRecordEvent).not.toHaveBeenCalledWith(expect.objectContaining({ eventType: 'CAMPAIGN_COMPLETED' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('pressing the CTA ends with CAMPAIGN_COMPLETED when it did not navigate', async () => {
    mockRunCta.mockResolvedValueOnce(false);
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignSequence campaign={campaign()} onDone={onDone} />);

    await user.press(screen.getByText('cta'));

    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_COMPLETED', screenId: 's1' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skips runCampaignCta in preview mode and still ends the sequence', async () => {
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignSequence campaign={campaign()} onDone={onDone} preview />);

    await user.press(screen.getByText('cta'));

    expect(mockRunCta).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('advances to the next screen immediately when the background image fails, without waiting for the timer', async () => {
    const user = userEvent.setup();
    await render(<CampaignSequence campaign={campaign()} onDone={jest.fn()} />);

    await user.press(screen.getByText('image-error'));

    expect(screen.getByText('Second')).toBeTruthy();
    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_SCREEN_SKIPPED', screenId: 's1' });
  });

  it('ends the sequence instead of a stuck black screen when the last screen image fails', async () => {
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(
      <CampaignSequence
        campaign={campaign({ screens: [{ id: 's1', position: 1, title: 'Only', durationSeconds: 5, actionType: 'NONE' } as never] })}
        onDone={onDone}
      />
    );

    await user.press(screen.getByText('image-error'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockRecordEvent).toHaveBeenCalledWith({ campaignId: 'c1', eventType: 'CAMPAIGN_COMPLETED', screenId: 's1' });
  });
});
