import { render, screen } from '@testing-library/react-native';

import TermsScreen from '@/app/(tabs)/settings/terms';
import { useTerms } from '@/features/terms/hooks/useTerms';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('@/features/terms/hooks/useTerms', () => ({
  useTerms: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

// TermsView renders the page's body text; the shape of that content belongs
// to the Terms & Conditions feature itself, not this screen.
jest.mock('@/features/terms/components/TermsView', () => ({
  TermsView: ({ page }: { page: unknown }) => {
    const { Text } = require('react-native');
    return <Text>page:{page ? 'loaded' : 'empty'}</Text>;
  },
}));

const mockUseTerms = useTerms as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;

describe('TermsScreen', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
  });

  it('shows a loading indicator while the page is loading', async () => {
    mockUseTerms.mockReturnValue({ page: null, loading: true, error: null, refetch });
    await render(<TermsScreen />);

    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
    expect(screen.queryByText(/page:/)).toBeNull();
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseTerms.mockReturnValue({ page: null, loading: false, error: new Error('boom'), refetch });
    await render(<TermsScreen />);

    expect(screen.getByText('Could not load the Terms & Conditions page.')).toBeTruthy();
  });

  it('renders the page content once loaded', async () => {
    mockUseTerms.mockReturnValue({
      page: { title: 'Our terms' },
      loading: false,
      error: null,
      refetch,
    });
    await render(<TermsScreen />);

    expect(screen.getByText('page:loaded')).toBeTruthy();
    expect(screen.getByText('@skater8')).toBeTruthy();
  });
});
