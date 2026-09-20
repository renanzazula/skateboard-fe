import { render, screen } from '@testing-library/react-native';

import AboutUsScreen from '@/app/(tabs)/settings/about-us';
import { useAboutPage } from '@/features/about/hooks/useAboutPage';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('@/features/about/hooks/useAboutPage', () => ({
  useAboutPage: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

// AboutPageView renders the page's block content; the shape of that content
// belongs to the About Us feature itself, not this screen.
jest.mock('@/features/about/components/AboutPageView', () => ({
  AboutPageView: ({ page }: { page: unknown }) => {
    const { Text } = require('react-native');
    return <Text>page:{page ? 'loaded' : 'empty'}</Text>;
  },
}));

const mockUseAboutPage = useAboutPage as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;

describe('AboutUsScreen', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
  });

  it('shows a loading indicator while the page is loading', async () => {
    mockUseAboutPage.mockReturnValue({ page: null, loading: true, error: null, refetch });
    await render(<AboutUsScreen />);

    expect(screen.getByText('About Us')).toBeTruthy();
    expect(screen.queryByText(/page:/)).toBeNull();
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseAboutPage.mockReturnValue({ page: null, loading: false, error: new Error('boom'), refetch });
    await render(<AboutUsScreen />);

    expect(screen.getByText('Could not load the About Us page.')).toBeTruthy();
  });

  it('renders the page content once loaded', async () => {
    mockUseAboutPage.mockReturnValue({
      page: { title: 'Our story' },
      loading: false,
      error: null,
      refetch,
    });
    await render(<AboutUsScreen />);

    expect(screen.getByText('page:loaded')).toBeTruthy();
    expect(screen.getByText('@skater8')).toBeTruthy();
  });
});
