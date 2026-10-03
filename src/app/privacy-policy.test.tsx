import { render, screen } from '@testing-library/react-native';

import PrivacyPolicyScreen from '@/app/privacy-policy';
import { usePrivacyPolicy } from '@/features/privacy-policy/hooks/usePrivacyPolicy';

jest.mock('@/features/privacy-policy/hooks/usePrivacyPolicy', () => ({
  usePrivacyPolicy: jest.fn(),
}));

// PrivacyPolicyView renders the page's body text; the shape of that content
// belongs to the Privacy Policy feature itself, not this screen.
jest.mock('@/features/privacy-policy/components/PrivacyPolicyView', () => ({
  PrivacyPolicyView: ({ page }: { page: unknown }) => {
    const { Text } = require('react-native');
    return <Text>page:{page ? 'loaded' : 'empty'}</Text>;
  },
}));

const mockUsePrivacyPolicy = usePrivacyPolicy as jest.Mock;

describe('PrivacyPolicyScreen', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while the page is loading', async () => {
    mockUsePrivacyPolicy.mockReturnValue({ page: null, loading: true, error: null, refetch });
    await render(<PrivacyPolicyScreen />);

    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.queryByText(/page:/)).toBeNull();
  });

  it('shows an error banner with retry when loading fails', async () => {
    mockUsePrivacyPolicy.mockReturnValue({ page: null, loading: false, error: new Error('boom'), refetch });
    await render(<PrivacyPolicyScreen />);

    expect(screen.getByText('Could not load the Privacy Policy page.')).toBeTruthy();
  });

  it('renders the page content once loaded', async () => {
    mockUsePrivacyPolicy.mockReturnValue({
      page: { title: 'Our policy' },
      loading: false,
      error: null,
      refetch,
    });
    await render(<PrivacyPolicyScreen />);

    expect(screen.getByText('page:loaded')).toBeTruthy();
  });
});
