import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import EditPodcastPostScreen from '@/app/(tabs)/podcast/admin/[id]';
import { useAuth } from '@/core/auth';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';
import { usePodcastPost } from '@/features/podcast/hooks/usePodcastPost';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'p1', slug: 'my-episode' })),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastAdmin', () => ({
  usePodcastAdmin: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastPost', () => ({
  usePodcastPost: jest.fn(),
}));

jest.mock('@/features/podcast/components/PostForm', () => {
  const { Pressable, Text } = require('react-native');
  return {
    PostForm: ({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (v: unknown) => void }) => (
      <Pressable onPress={() => onSubmit({ title: 'Updated Episode' })}>
        <Text>{submitLabel}</Text>
      </Pressable>
    ),
  };
});

const { Redirect, router } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUsePodcastAdmin = usePodcastAdmin as jest.Mock;
const mockUsePodcastPost = usePodcastPost as jest.Mock;

const POST = { id: 'p1', slug: 'my-episode', title: 'My Episode', coverUrl: 'https://x/c.jpg', status: 'published', blocks: [] };

describe('EditPodcastPostScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, updatePost: jest.fn() });
  });

  it('redirects to the feed when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUsePodcastPost.mockReturnValue({ post: null, loading: false, error: null, refetch: jest.fn() });

    await render(<EditPodcastPostScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/podcast' });
  });

  it('shows a loading indicator while loading', async () => {
    mockUsePodcastPost.mockReturnValue({ post: null, loading: true, error: null, refetch: jest.fn() });
    const { toJSON } = await render(<EditPodcastPostScreen />);

    expect(toJSON()).toBeTruthy();
    expect(screen.queryByText('Save changes')).toBeNull();
  });

  it('shows an error banner with retry when the post fails to load', async () => {
    const refetch = jest.fn();
    mockUsePodcastPost.mockReturnValue({ post: null, loading: false, error: new Error('offline'), refetch });
    const user = userEvent.setup();
    await render(<EditPodcastPostScreen />);

    expect(screen.getByText('Post not found.')).toBeTruthy();

    await user.press(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the form once loaded', async () => {
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    await render(<EditPodcastPostScreen />);

    expect(screen.getByText('Save changes')).toBeTruthy();
  });

  it('saves and navigates to the (possibly renamed) slug', async () => {
    const updatePost = jest.fn().mockResolvedValueOnce({ slug: 'renamed-episode' });
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, updatePost });
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    await render(<EditPodcastPostScreen />);

    await user.press(screen.getByText('Save changes'));

    expect(updatePost).toHaveBeenCalledWith('p1', { title: 'Updated Episode' });
    expect(router.replace).toHaveBeenCalledWith('/podcast/renamed-episode');
  });

  it('falls back to the original slug when the response has none', async () => {
    const updatePost = jest.fn().mockResolvedValueOnce({});
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, updatePost });
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    await render(<EditPodcastPostScreen />);

    await user.press(screen.getByText('Save changes'));

    expect(router.replace).toHaveBeenCalledWith('/podcast/my-episode');
  });

  it('shows an error alert when saving fails', async () => {
    const updatePost = jest.fn().mockRejectedValueOnce(new Error('denied'));
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, updatePost });
    mockUsePodcastPost.mockReturnValue({ post: POST, loading: false, error: null, refetch: jest.fn() });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<EditPodcastPostScreen />);

    await user.press(screen.getByText('Save changes'));

    expect(alertSpy).toHaveBeenCalledWith('Could not save changes', 'Try again.', undefined);
  });
});
