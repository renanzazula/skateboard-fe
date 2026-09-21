import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import NewPodcastPostScreen from '@/app/(tabs)/podcast/admin/new';
import { useAuth } from '@/core/auth';
import { usePodcastAdmin } from '@/features/podcast/hooks/usePodcastAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  router: { replace: jest.fn() },
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/usePodcastAdmin', () => ({
  usePodcastAdmin: jest.fn(),
}));

jest.mock('@/features/podcast/components/PostForm', () => {
  const { Pressable, Text } = require('react-native');
  return {
    PostForm: ({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (v: unknown) => void }) => (
      <Pressable onPress={() => onSubmit({ title: 'New Episode' })}>
        <Text>{submitLabel}</Text>
      </Pressable>
    ),
  };
});

const { Redirect, router } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUsePodcastAdmin = usePodcastAdmin as jest.Mock;

describe('NewPodcastPostScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
  });

  it('redirects to the feed when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, createPost: jest.fn() });

    await render(<NewPodcastPostScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/podcast' });
  });

  it('creates the post and navigates to its detail page', async () => {
    const createPost = jest.fn().mockResolvedValueOnce({ slug: 'new-episode' });
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, createPost });
    const user = userEvent.setup();
    await render(<NewPodcastPostScreen />);

    await user.press(screen.getByText('Create post'));

    expect(createPost).toHaveBeenCalledWith({ title: 'New Episode' });
    expect(router.replace).toHaveBeenCalledWith('/podcast/new-episode');
  });

  it('shows an error alert when creation fails', async () => {
    const createPost = jest.fn().mockRejectedValueOnce(new Error('denied'));
    mockUsePodcastAdmin.mockReturnValue({ submitting: false, createPost });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<NewPodcastPostScreen />);

    await user.press(screen.getByText('Create post'));

    expect(alertSpy).toHaveBeenCalledWith('Could not create post', 'Try again.', undefined);
  });
});
