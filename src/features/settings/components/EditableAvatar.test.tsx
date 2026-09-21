import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useAccountActions } from '@/features/account/hooks/useAccountActions';
import { setProfile } from '@/features/account/hooks/useProfile';
import { EditableAvatar } from '@/features/settings/components/EditableAvatar';

jest.mock('@/features/account/hooks/useAccountActions', () => ({
  useAccountActions: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  setProfile: jest.fn(),
}));

jest.mock('@/shared/components/image-upload', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ImageUploadDialog: ({
      visible,
      onCancel,
      onConfirm,
    }: {
      visible: boolean;
      onCancel: () => void;
      onConfirm: (asset: { uri: string }) => void;
    }) =>
      visible ? (
        <>
          <Pressable onPress={() => onConfirm({ uri: 'file://processed.jpg' })}>
            <Text>confirm-upload</Text>
          </Pressable>
          <Pressable onPress={onCancel}>
            <Text>cancel-upload</Text>
          </Pressable>
        </>
      ) : null,
  };
});

const mockUseAccountActions = useAccountActions as jest.Mock;
const mockSetProfile = setProfile as jest.Mock;

function actions(overrides: Partial<ReturnType<typeof useAccountActions>> = {}) {
  return {
    submitting: false,
    uploadProfilePicture: jest.fn(),
    ...overrides,
  };
}

describe('EditableAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows initials when there is no image', async () => {
    mockUseAccountActions.mockReturnValue(actions());
    await render(<EditableAvatar imageUrl={null} initials="SK" onUploaded={jest.fn()} />);

    expect(screen.getByText('SK')).toBeTruthy();
  });

  it('opens the upload dialog on press', async () => {
    mockUseAccountActions.mockReturnValue(actions());
    const user = userEvent.setup();
    await render(<EditableAvatar imageUrl={null} initials="SK" onUploaded={jest.fn()} />);

    expect(screen.queryByText('confirm-upload')).toBeNull();

    await user.press(screen.getByLabelText('Change profile picture'));

    expect(screen.getByText('confirm-upload')).toBeTruthy();
  });

  it('cancelling the dialog closes it without uploading', async () => {
    mockUseAccountActions.mockReturnValue(actions());
    const user = userEvent.setup();
    await render(<EditableAvatar imageUrl={null} initials="SK" onUploaded={jest.fn()} />);

    await user.press(screen.getByLabelText('Change profile picture'));
    await user.press(screen.getByText('cancel-upload'));

    expect(screen.queryByText('confirm-upload')).toBeNull();
  });

  it('uploads the confirmed asset, applies the profile, and calls onUploaded', async () => {
    const uploadProfilePicture = jest.fn().mockResolvedValueOnce({ username: 'skater8', avatarUrl: 'https://x/a.jpg' });
    mockUseAccountActions.mockReturnValue(actions({ uploadProfilePicture }));
    const onUploaded = jest.fn();
    const user = userEvent.setup();
    await render(<EditableAvatar imageUrl={null} initials="SK" onUploaded={onUploaded} />);

    await user.press(screen.getByLabelText('Change profile picture'));
    await user.press(screen.getByText('confirm-upload'));

    expect(uploadProfilePicture).toHaveBeenCalledWith({ uri: 'file://processed.jpg' });
    expect(mockSetProfile).toHaveBeenCalledWith({ username: 'skater8', avatarUrl: 'https://x/a.jpg' });
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('confirm-upload')).toBeNull();
  });

  it('shows an error alert when the upload fails', async () => {
    const uploadProfilePicture = jest.fn().mockRejectedValueOnce(new Error('offline'));
    mockUseAccountActions.mockReturnValue(actions({ uploadProfilePicture }));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<EditableAvatar imageUrl={null} initials="SK" onUploaded={jest.fn()} />);

    await user.press(screen.getByLabelText('Change profile picture'));
    await user.press(screen.getByText('confirm-upload'));

    expect(alertSpy).toHaveBeenCalledWith('Could not update profile picture', 'Try again.', undefined);
  });

  it('is disabled while submitting', async () => {
    mockUseAccountActions.mockReturnValue(actions({ submitting: true }));
    await render(<EditableAvatar imageUrl={null} initials="SK" onUploaded={jest.fn()} />);

    expect(screen.getByLabelText('Change profile picture').props.accessibilityState.disabled).toBe(true);
  });

  it('falls back to initials when the image fails to load', async () => {
    mockUseAccountActions.mockReturnValue(actions());
    const view = await render(<EditableAvatar imageUrl="https://x/broken.jpg" initials="SK" onUploaded={jest.fn()} />);

    type JsonNode = { type: string; props: Record<string, any>; children: JsonNode[] | string[] | null };
    function findNode(node: JsonNode | JsonNode[] | string | null, predicate: (n: JsonNode) => boolean): JsonNode | null {
      if (!node) return null;
      const nodes = Array.isArray(node) ? node : [node];
      for (const n of nodes) {
        if (typeof n === 'string') continue;
        if (predicate(n)) return n;
        const found = findNode(n.children as JsonNode[] | null, predicate);
        if (found) return found;
      }
      return null;
    }

    const image = findNode(view.toJSON(), (n) => typeof n.props.onError === 'function')!;
    await require('@testing-library/react-native').act(async () => image.props.onError({ nativeEvent: { error: 'failed' } }));

    expect(screen.getByText('SK')).toBeTruthy();
  });
});
