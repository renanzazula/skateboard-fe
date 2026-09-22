import { render, screen, userEvent } from '@testing-library/react-native';

import DataStorageScreen from '@/app/(tabs)/settings/data-storage';
import { useProfile } from '@/features/account/hooks/useProfile';
import { useLocalSettings } from '@/features/settings/hooks/useLocalSettings';

jest.mock('@/features/account/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/features/settings/hooks/useLocalSettings', () => ({
  useLocalSettings: jest.fn(),
}));

const mockUseProfile = useProfile as jest.Mock;
const mockUseLocalSettings = useLocalSettings as jest.Mock;

describe('DataStorageScreen', () => {
  const toggleDownloadWifiOnly = jest.fn();
  const clearCache = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({ profile: { username: 'skater8' } });
    mockUseLocalSettings.mockReturnValue({
      downloadWifiOnly: false,
      storageUsage: '12 MB',
      isCalculatingStorage: false,
      toggleDownloadWifiOnly,
      clearCache,
    });
  });

  it('renders the storage usage and clear-cache rows', async () => {
    await render(<DataStorageScreen />);

    expect(screen.getByText('Free 12 MB')).toBeTruthy();
    expect(screen.getByText('12 MB')).toBeTruthy();
    expect(screen.getByText('Download over Wi‑Fi only')).toBeTruthy();
  });

  it('clears the cache when the row is pressed', async () => {
    const user = userEvent.setup();
    await render(<DataStorageScreen />);

    await user.press(screen.getByText('Clear cache'));

    expect(clearCache).toHaveBeenCalledTimes(1);
  });

  it('toggles wifi-only downloads', async () => {
    const user = userEvent.setup();
    await render(<DataStorageScreen />);

    await user.press(screen.getByText('Download over Wi‑Fi only'));

    expect(toggleDownloadWifiOnly).toHaveBeenCalledWith(true);
  });
});
