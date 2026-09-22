import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { env } from '@/core/config/env';
import { CampaignGate } from '@/features/campaign/components/CampaignGate';
import type { CampaignRuntime } from '@/features/campaign/types';

jest.mock('@/core/config/env', () => ({
  env: { campaignsEnabled: true },
}));

jest.mock('@/features/campaign/components/CampaignSequence', () => {
  const { Pressable, Text: RNText } = require('react-native');
  return {
    CampaignSequence: ({ onDone }: { onDone: () => void }) => (
      <Pressable onPress={onDone}>
        <RNText>campaign-sequence</RNText>
      </Pressable>
    ),
  };
});

const CAMPAIGN: CampaignRuntime = { id: 'c1', priority: 1, frequencyType: 'ALWAYS', screens: [] };

describe('CampaignGate', () => {
  beforeEach(() => {
    (env as { campaignsEnabled: boolean }).campaignsEnabled = true;
  });

  it('always renders children', async () => {
    await render(
      <CampaignGate phase="ready" campaign={null} markShown={jest.fn()}>
        <Text>app content</Text>
      </CampaignGate>
    );

    expect(screen.getByText('app content')).toBeTruthy();
  });

  it('shows the campaign sequence when eligible', async () => {
    await render(
      <CampaignGate phase="ready" campaign={CAMPAIGN} markShown={jest.fn()}>
        <Text>app content</Text>
      </CampaignGate>
    );

    expect(screen.getByText('campaign-sequence')).toBeTruthy();
  });

  it('does not show the sequence while resolving', async () => {
    await render(
      <CampaignGate phase="resolving" campaign={CAMPAIGN} markShown={jest.fn()}>
        <Text>app content</Text>
      </CampaignGate>
    );

    expect(screen.queryByText('campaign-sequence')).toBeNull();
  });

  it('does not show the sequence when there is no eligible campaign', async () => {
    await render(
      <CampaignGate phase="ready" campaign={null} markShown={jest.fn()}>
        <Text>app content</Text>
      </CampaignGate>
    );

    expect(screen.queryByText('campaign-sequence')).toBeNull();
  });

  it('does not show the sequence when the feature flag is off', async () => {
    (env as { campaignsEnabled: boolean }).campaignsEnabled = false;
    await render(
      <CampaignGate phase="ready" campaign={CAMPAIGN} markShown={jest.fn()}>
        <Text>app content</Text>
      </CampaignGate>
    );

    expect(screen.queryByText('campaign-sequence')).toBeNull();
  });

  it('marks the campaign shown and hides the sequence once it finishes', async () => {
    const markShown = jest.fn();
    const user = userEvent.setup();
    await render(
      <CampaignGate phase="ready" campaign={CAMPAIGN} markShown={markShown}>
        <Text>app content</Text>
      </CampaignGate>
    );

    await user.press(screen.getByText('campaign-sequence'));

    expect(markShown).toHaveBeenCalledWith('c1');
    expect(screen.queryByText('campaign-sequence')).toBeNull();
  });
});
