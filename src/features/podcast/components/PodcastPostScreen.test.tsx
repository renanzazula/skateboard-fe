import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/core/auth';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';
import { PodcastPostScreen } from '@/features/podcast/components/PodcastPostScreen';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ slug: 'my-episode' })),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastPost', () => ({
  usePodcastPost: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastAdmin', () => ({
  usePodcastAdmin: jest.fn(),
}));

jest.mock('@/features/podcast/components/PodcastEpisodeDetail', () => {
  const { Pressable, Text } = require('react-native');
  return {
    PodcastEpisodeDetail: ({
      onBack,
      onEdit,
      onDelete,
    }: {
      onBack: () => void;
      onEdit: () => void;
      onDelete: () => void;
    }) => (
      <>
        <Pressable onPress={onBack}>
          <Text>back</Text>
        </Pressable>
        <Pressable onPress={onEdit}>
          <Text>edit</Text>
        </Pressable>
        <Pressable onPress={onDelete}>
          <Text>delete</Text>
        </Pressable>
      </>
    ),
  };
});

const { router } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUsePodcastPost = usePodcastPost as jest.Mock;
const mockUsePodcastAdmin = usePodcastAdmin as jest.Mock;

const POST = { id: 'p1', slug: 'my-episode', title: 'My Episode' };

describe('PodcastPostScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, deletePost: jest.fn() });
  });

  it('shows a loading indicator while loading', async () => {
    mockUsePodcastPost.mockReturnValue({ post: null, loading: true, error: null, refetch: jest.fn() });
    await render(<PodcastPostScreen />);

    expect(screen.queryByText('back')).toBeNull();
  });

  it('shows an error banner with retry when the post fails to load', async () => {
    const refetch = jest.fn();
    mockUsePodcastPost.mockReturnValue({ post: null, loading: false, error: new Error('offline'), refetch });
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    expect(screen.getByText('Post not found.')).toBeTruthy();
    await user.press(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the episode detail once loaded', async () => {
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    await render(<PodcastPostScreen />);

    expect(screen.getByText('back')).toBeTruthy();
  });

  it('goes back via router.back() when the stack has history', async () => {
    router.canGoBack.mockReturnValue(true);
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    await user.press(screen.getByText('back'));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the home route when there is no history to go back to', async () => {
    router.canGoBack.mockReturnValue(false);
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    await user.press(screen.getByText('back'));

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('navigates to the edit screen with the post id and slug', async () => {
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    await user.press(screen.getByText('edit'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/podcast/admin/[id]', params: { id: 'p1', slug: 'my-episode' } });
  });

  it('deletes the post after confirmation and navigates back', async () => {
    router.canGoBack.mockReturnValue(true);
    const deletePost = jest.fn().mockResolvedValueOnce(undefined);
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, deletePost });
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    await user.press(screen.getByText('delete'));

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(deletePost).toHaveBeenCalledWith('p1');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows an error alert when deletion fails', async () => {
    const deletePost = jest.fn().mockRejectedValueOnce(new Error('denied'));
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, deletePost });
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    await user.press(screen.getByText('delete'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    await confirmButton?.onPress?.();

    expect(alertSpy).toHaveBeenLastCalledWith('Could not delete post', 'Try again.', undefined);
  });

  it('does nothing when delete is pressed while already submitting', async () => {
    mockUsePodcastAdmin.mockReturnValue({ submitting: true, deletePost: jest.fn() });
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<PodcastPostScreen />);

    await user.press(screen.getByText('delete'));

    expect(alertSpy).not.toHaveBeenCalled();
  });
});
