import { render, screen, userEvent } from '@testing-library/react-native';

import { HomeVideoGalleryItem } from '@/features/home/components/HomeVideoGalleryItem';
import { useImageAspectRatio } from '@/features/home/hooks/useImageAspectRatio';
import type { Video } from '@/shared/types/video';

jest.mock('@/features/home/hooks/useImageAspectRatio', () => ({
  useImageAspectRatio: jest.fn(),
}));

const mockUseImageAspectRatio = useImageAspectRatio as jest.Mock;

const VIDEO: Video = {
  id: 'v1',
  title: 'A Great Video',
  thumbnailUrl: 'https://x/thumb.jpg',
} as Video;

describe('HomeVideoGalleryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImageAspectRatio.mockReturnValue(16 / 9);
  });

  it('renders the thumbnail image with an accessible label', async () => {
    await render(<HomeVideoGalleryItem video={VIDEO} onPress={jest.fn()} />);

    expect(screen.getByLabelText('A Great Video')).toBeTruthy();
  });

  it('renders a placeholder icon when there is no thumbnail url', async () => {
    await render(<HomeVideoGalleryItem video={{ ...VIDEO, thumbnailUrl: undefined }} onPress={jest.fn()} />);

    expect(screen.getByLabelText('A Great Video')).toBeTruthy();
  });

  it('calls onPress with the video when pressed', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<HomeVideoGalleryItem video={VIDEO} onPress={onPress} />);

    await user.press(screen.getByLabelText('A Great Video'));

    expect(onPress).toHaveBeenCalledWith(VIDEO);
  });

  it('passes known backend dimensions to the aspect ratio hook ahead of a probe', async () => {
    await render(
      <HomeVideoGalleryItem video={{ ...VIDEO, thumbnailWidth: 400, thumbnailHeight: 200 }} onPress={jest.fn()} />
    );

    expect(mockUseImageAspectRatio).toHaveBeenCalledWith('https://x/thumb.jpg', 2);
  });
});
