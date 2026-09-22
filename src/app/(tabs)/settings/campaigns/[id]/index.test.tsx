import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import CampaignEditorScreen from '@/app/(tabs)/settings/campaigns/[id]/index';
import { useAuth } from '@/core/auth';
import { useCampaignAdmin } from '@/features/campaign/admin/hooks/useCampaignAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'c1' })),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/campaign/admin/hooks/useCampaignAdmin', () => ({
  useCampaignAdmin: jest.fn(),
}));

// jest.mock factories can't reference out-of-scope variables (they run before
// imports are wired up), so react-native's components are required lazily
// inside each factory rather than imported at module scope.
jest.mock('@/features/campaign/admin/components/CampaignForm', () => {
  const { Pressable, Text } = require('react-native');
  return {
    CampaignForm: ({ onSubmit }: { onSubmit: (body: unknown) => void }) => (
      <Pressable onPress={() => onSubmit({ name: 'Updated' })}>
        <Text>submit-campaign-form</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/features/campaign/admin/components/CampaignScreenForm', () => {
  const { Pressable, Text } = require('react-native');
  return {
    CampaignScreenForm: ({ onSubmit }: { onSubmit: (body: unknown, image?: unknown) => void }) => (
      <Pressable onPress={() => onSubmit({ position: 0 })}>
        <Text>submit-screen-form</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/features/campaign/admin/components/CampaignScreenList', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    CampaignScreenList: ({
      onAdd,
      onEdit,
      onRemove,
      onReorder,
    }: {
      onAdd: () => void;
      onEdit: (screen: { id: string }) => void;
      onRemove: (screen: { id: string }) => void;
      onReorder: (ids: string[]) => void;
    }) => (
      <View>
        <Pressable onPress={onAdd}>
          <Text>add-screen</Text>
        </Pressable>
        <Pressable onPress={() => onEdit({ id: 's1' })}>
          <Text>edit-screen</Text>
        </Pressable>
        <Pressable onPress={() => onRemove({ id: 's1' })}>
          <Text>remove-screen</Text>
        </Pressable>
        <Pressable onPress={() => onReorder(['s2', 's1'])}>
          <Text>reorder-screens</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock('@/features/campaign/admin/components/CampaignStatusBadge', () => {
  const { Text } = require('react-native');
  return {
    CampaignStatusBadge: ({ status }: { status: string }) => <Text>status-{status}</Text>,
  };
});

jest.mock('@/features/campaign/admin/components/LifecycleActions', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    LifecycleActions: ({
      onPublish,
      onPause,
      onArchive,
      onDelete,
    }: {
      onPublish: () => void;
      onPause: () => void;
      onArchive: () => void;
      onDelete: () => void;
    }) => (
      <View>
        <Pressable onPress={onPublish}>
          <Text>lifecycle-publish</Text>
        </Pressable>
        <Pressable onPress={onPause}>
          <Text>lifecycle-pause</Text>
        </Pressable>
        <Pressable onPress={onArchive}>
          <Text>lifecycle-archive</Text>
        </Pressable>
        <Pressable onPress={onDelete}>
          <Text>lifecycle-delete</Text>
        </Pressable>
      </View>
    ),
  };
});

const { Redirect, router, useLocalSearchParams } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseCampaignAdmin = useCampaignAdmin as jest.Mock;

const CAMPAIGN = { id: 'c1', name: 'Summer Drop', status: 'DRAFT', screens: [] };

function admin(overrides: Partial<ReturnType<typeof useCampaignAdmin>> = {}) {
  return {
    submitting: false,
    getCampaign: jest.fn().mockResolvedValue(CAMPAIGN),
    updateCampaign: jest.fn(),
    lifecycle: jest.fn(),
    deleteCampaign: jest.fn(),
    addScreen: jest.fn(),
    updateScreen: jest.fn(),
    removeScreen: jest.fn(),
    reorderScreens: jest.fn(),
    uploadScreenImage: jest.fn(),
    ...overrides,
  };
}

describe('CampaignEditorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'c1' });
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
  });

  it('redirects to settings when unauthorized to read', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUseCampaignAdmin.mockReturnValue(admin());

    await render(<CampaignEditorScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows an error banner when loading fails, with a working retry', async () => {
    const refreshAdmin = admin({
      getCampaign: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(CAMPAIGN),
    });
    mockUseCampaignAdmin.mockReturnValue(refreshAdmin);
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);

    expect(await screen.findByText('Could not load campaigns.')).toBeTruthy();
    await user.press(screen.getByText('Retry'));

    expect(await screen.findByText('Summer Drop')).toBeTruthy();
    expect(refreshAdmin.getCampaign).toHaveBeenCalledTimes(2);
  });

  it('renders the campaign detail view once loaded', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin());

    await render(<CampaignEditorScreen />);

    expect(await screen.findByText('Summer Drop')).toBeTruthy();
    expect(screen.getByText('status-DRAFT')).toBeTruthy();
  });

  it('saves campaign edits and shows a success alert', async () => {
    const updateCampaign = jest.fn().mockResolvedValueOnce({ ...CAMPAIGN, name: 'Updated' });
    mockUseCampaignAdmin.mockReturnValue(admin({ updateCampaign }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('submit-campaign-form'));

    expect(updateCampaign).toHaveBeenCalledWith('c1', { name: 'Updated' });
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Campaign saved.', undefined);
  });

  it('shows an error alert when saving fails', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin({ updateCampaign: jest.fn().mockRejectedValueOnce(new Error('nope')) }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('submit-campaign-form'));

    expect(alertSpy).toHaveBeenCalledWith('Could not save the campaign', 'Try again.', undefined);
  });

  it('runs lifecycle actions and updates the campaign in place', async () => {
    const lifecycle = jest.fn().mockResolvedValueOnce({ ...CAMPAIGN, status: 'ACTIVE' });
    mockUseCampaignAdmin.mockReturnValue(admin({ lifecycle }));
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('lifecycle-publish'));

    expect(lifecycle).toHaveBeenCalledWith('c1', 'publish');
    expect(await screen.findByText('status-ACTIVE')).toBeTruthy();
  });

  it('deletes the campaign after confirmation and navigates back to the list', async () => {
    const deleteCampaign = jest.fn().mockResolvedValueOnce(undefined);
    mockUseCampaignAdmin.mockReturnValue(admin({ deleteCampaign }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('lifecycle-delete'));

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(deleteCampaign).toHaveBeenCalledWith('c1');
    expect(router.replace).toHaveBeenCalledWith('/settings/campaigns');
  });

  it('opens the add-screen panel and submits a new screen', async () => {
    const addScreen = jest.fn().mockResolvedValueOnce({ id: 's1' });
    const refreshedCampaign = { ...CAMPAIGN, screens: [{ id: 's1', position: 0 }] };
    mockUseCampaignAdmin.mockReturnValue(admin({ addScreen, getCampaign: jest.fn().mockResolvedValue(refreshedCampaign) }));
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('add-screen'));
    await screen.findByText('submit-screen-form');
    await user.press(screen.getByText('submit-screen-form'));

    expect(addScreen).toHaveBeenCalledWith('c1', { position: 0 });
    expect(await screen.findByText('Summer Drop')).toBeTruthy();
  });

  it('edits an existing screen via updateScreen', async () => {
    const updateScreen = jest.fn().mockResolvedValueOnce({ id: 's1' });
    mockUseCampaignAdmin.mockReturnValue(admin({ updateScreen }));
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('edit-screen'));
    await screen.findByText('submit-screen-form');
    await user.press(screen.getByText('submit-screen-form'));

    expect(updateScreen).toHaveBeenCalledWith('c1', 's1', { position: 0 });
  });

  it('removes a screen after confirmation', async () => {
    const removeScreen = jest.fn().mockResolvedValueOnce(undefined);
    mockUseCampaignAdmin.mockReturnValue(admin({ removeScreen }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('remove-screen'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(removeScreen).toHaveBeenCalledWith('c1', 's1');
  });

  it('reorders screens', async () => {
    const reorderScreens = jest.fn().mockResolvedValueOnce(CAMPAIGN);
    mockUseCampaignAdmin.mockReturnValue(admin({ reorderScreens }));
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('reorder-screens'));

    expect(reorderScreens).toHaveBeenCalledWith('c1', ['s2', 's1']);
  });

  it('reloads the campaign when reordering fails', async () => {
    const getCampaign = jest.fn().mockResolvedValue(CAMPAIGN);
    const reorderScreens = jest.fn().mockRejectedValueOnce(new Error('conflict'));
    mockUseCampaignAdmin.mockReturnValue(admin({ reorderScreens, getCampaign }));
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('reorder-screens'));

    expect(getCampaign).toHaveBeenCalledTimes(2);
  });

  it('navigates to the preview screen', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin());
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('Preview'));

    expect(router.push).toHaveBeenCalledWith('/settings/campaigns/c1/preview');
  });

  it('closes the screen', async () => {
    mockUseCampaignAdmin.mockReturnValue(admin());
    const user = userEvent.setup();

    await render(<CampaignEditorScreen />);
    await screen.findByText('Summer Drop');

    await user.press(screen.getByText('Close'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
