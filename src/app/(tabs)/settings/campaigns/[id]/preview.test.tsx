import { render, screen, userEvent } from '@testing-library/react-native';

import CampaignPreviewScreen from '@/app/(tabs)/settings/campaigns/[id]/preview';
import { useAuth } from '@/core/auth';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useLocalSearchParams: jest.fn(() => ({ id: 'c1' })),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/campaign/admin/hooks/useCampaignAdmin', () => ({
  useCampaignAdmin: jest.fn(),
}));

jest.mock('@/features/campaign/admin/components/CampaignScreenInspector', () => {
  const { Text } = require('react-native');
  return {
    CampaignScreenInspector: ({ screens }: { screens: Array<{ id: string }> }) => (
      <Text>inspector-{screens.length}</Text>
    ),
  };
});

jest.mock('@/features/campaign/components/CampaignSequence', () => {
  const { Pressable, Text } = require('react-native');
  return {
    CampaignSequence: ({ onDone, preview }: { onDone: () => void; preview: boolean }) => (
      <Pressable onPress={onDone}>
        <Text>{preview ? 'sequence-preview' : 'sequence-live'}</Text>
      </Pressable>
    ),
  };
});

const { Redirect, useLocalSearchParams } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseCampaignAdmin = useCampaignAdmin as jest.Mock;

const CAMPAIGN = {
  id: 'c1',
  priority: 1,
  frequencyType: 'ALWAYS',
  screens: [{ id: 's2', position: 2 }, { id: 's1', position: 1 }],
};

function admin(overrides: Partial<ReturnType<typeof useCampaignAdmin>> = {}) {
  return { getCampaign: jest.fn().mockResolvedValue(CAMPAIGN), ...overrides };
}

describe('CampaignPreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'c1' });
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseCampaignAdmin.mockReturnValue(admin());

    await render(<CampaignPreviewScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows an error banner with retry when loading fails', async () => {
    const getCampaign = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(CAMPAIGN);
    mockUseCampaignAdmin.mockReturnValue(admin({ getCampaign }));
    const user = userEvent.setup();

    await render(<CampaignPreviewScreen />);

    expect(await screen.findByText('A campaign needs 1–3 screens to publish.')).toBeTruthy();

    await user.press(screen.getByText('Retry'));

    expect(await screen.findByText('inspector-2')).toBeTruthy();
    expect(getCampaign).toHaveBeenCalledTimes(2);
  });

  it('shows the same error banner when the campaign has no screens', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin({ getCampaign: jest.fn().mockResolvedValue({ ...CAMPAIGN, screens: [] }) }));

    await render(<CampaignPreviewScreen />);

    expect(await screen.findByText('A campaign needs 1–3 screens to publish.')).toBeTruthy();
  });

  it('inspects screens sorted by position by default', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin());

    await render(<CampaignPreviewScreen />);

    expect(await screen.findByText('inspector-2')).toBeTruthy();
  });

  it('runs the sequence in preview mode and returns to the picker when done', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin());
    const user = userEvent.setup();

    await render(<CampaignPreviewScreen />);
    await screen.findByText('inspector-2');

    // "Preview" appears three times in inspect mode: the header title, the
    // ChoiceChips label, and the "play" option's chip — press the chip.
    await user.press(screen.getAllByText('Preview')[2]);
    await screen.findByText('Plays the campaign exactly as users will see it.');
    // In play mode, "Preview" appears four times: the header, the label, the
    // now-active chip, and the play-CTA button — the button is the last one.
    const playButton = screen.getAllByText('Preview').at(-1)!;
    await user.press(playButton);

    expect(await screen.findByText('sequence-preview')).toBeTruthy();

    await user.press(screen.getByText('sequence-preview'));

    // onDone only resets `playing`, not `mode` — back to the play-mode picker
    // (CTA + hint), not the inspect-mode screen.
    expect(await screen.findByText('Plays the campaign exactly as users will see it.')).toBeTruthy();
  });
});
