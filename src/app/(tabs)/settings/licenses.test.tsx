import { render, screen } from '@testing-library/react-native';

import LicensesScreen from '@/app/(tabs)/settings/licenses';
import { useLicenses } from '@/features/licenses/hooks/useLicenses';
import { useProfile } from '@/features/account/hooks/useProfile';

jest.mock('@/features/licenses/hooks/useLicenses', () => ({
  useLicenses: jest.fn(),
}));

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

// LicensesView renders the page's body text; the shape of that content
// belongs to the Open-source Licenses feature itself, not this screen.
jest.mock('@/features/licenses/components/LicensesView', () => ({
  LicensesView: ({ page }: { page: unknown }) => {
    const { Text } = require('react-native');
    return <Text>page:{page ? 'loaded' : 'empty'}</Text>;
  },
}));

const mockUseLicenses = useLicenses as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;

describe('LicensesScreen', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
  });

  it('shows a loading indicator while the page is loading', async () => {
    mockUseLicenses.mockReturnValue({ page: null, loading: true, error: null, refetch });
    await render(<LicensesScreen />);

    expect(screen.getByText('Open-source Licenses')).toBeTruthy();
    expect(screen.queryByText(/page:/)).toBeNull();
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUseLicenses.mockReturnValue({ page: null, loading: false, error: new Error('boom'), refetch });
    await render(<LicensesScreen />);

    expect(screen.getByText('Could not load the Open-source Licenses page.')).toBeTruthy();
  });

  it('renders the page content once loaded', async () => {
    mockUseLicenses.mockReturnValue({
      page: { title: 'Our licenses' },
      loading: false,
      error: null,
      refetch,
    });
    await render(<LicensesScreen />);

    expect(screen.getByText('page:loaded')).toBeTruthy();
    expect(screen.getByText('@skater8')).toBeTruthy();
  });
});
