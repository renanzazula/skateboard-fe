import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import HomeCategoriesScreen from '@/app/(tabs)/settings/home-categories';
import { useAuth } from '@/core/auth';
import { useCategories } from '@/features/podcast/hooks/useCategories';
import { useHomeCategoryAdmin } from '@/features/home/hooks/useHomeCategoryAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/useCategories', () => ({
  useCategories: jest.fn(),
}));

jest.mock('@/features/home/hooks/useHomeCategoryAdmin', () => ({
  useHomeCategoryAdmin: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseCategories = useCategories as jest.Mock;
const mockUseHomeCategoryAdmin = useHomeCategoryAdmin as jest.Mock;

describe('HomeCategoriesScreen', () => {
  const getConfig = jest.fn();
  const updateConfig = jest.fn();
  const refreshCategories = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    mockUseCategories.mockReturnValue({
      categories: [
        { id: 'c1', slug: 'tricks', name: 'Tricks' },
        { id: 'c2', slug: 'news', name: 'News' },
      ],
      isLoading: false,
      error: null,
      refresh: refreshCategories,
    });
    mockUseHomeCategoryAdmin.mockReturnValue({ submitting: false, getConfig, updateConfig });
    getConfig.mockResolvedValue({ mode: 'ALL', enabledCategoryIds: [] });
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    await render(<HomeCategoriesScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
    expect(getConfig).not.toHaveBeenCalled();
  });

  it('shows an error banner when the config fails to load', async () => {
    getConfig.mockRejectedValueOnce(new Error('offline'));
    await render(<HomeCategoriesScreen />);

    expect(await screen.findByText('Could not load Home categories.')).toBeTruthy();
  });

  it('shows an error banner when categories fail to load, and retries both', async () => {
    mockUseCategories.mockReturnValue({
      categories: [],
      isLoading: false,
      error: new Error('categories down'),
      refresh: refreshCategories,
    });
    const user = userEvent.setup();
    await render(<HomeCategoriesScreen />);

    expect(await screen.findByText('Could not load Home categories.')).toBeTruthy();
    await user.press(screen.getByText('Retry'));

    expect(getConfig).toHaveBeenCalledTimes(2);
    expect(refreshCategories).toHaveBeenCalledTimes(1);
  });

  it('defaults to All categories and hides the per-category list', async () => {
    await render(<HomeCategoriesScreen />);

    expect(await screen.findByText('All categories')).toBeTruthy();
    expect(screen.queryByText('Tricks')).toBeNull();
  });

  it('switches to Selected mode, requires at least one category, and saves', async () => {
    getConfig.mockResolvedValue({ mode: 'ALL', enabledCategoryIds: [] });
    updateConfig.mockResolvedValueOnce(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<HomeCategoriesScreen />);
    await screen.findByText('All categories');

    await user.press(screen.getByText('Selected categories'));
    expect(await screen.findByText('Tricks')).toBeTruthy();
    expect(screen.getByText('Select at least one category.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState?.disabled).toBe(true);

    await user.press(screen.getByText('Tricks'));
    expect(screen.queryByText('Select at least one category.')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(updateConfig).toHaveBeenCalledWith('SELECTED', ['tricks']);
    expect(alertSpy).toHaveBeenCalledWith('Saved', 'Home video categories updated.', undefined);
  });

  it('pre-selects the configured categories when mode is already SELECTED', async () => {
    getConfig.mockResolvedValue({ mode: 'SELECTED', enabledCategoryIds: ['news'] });
    await render(<HomeCategoriesScreen />);

    expect(await screen.findByText('News')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState?.disabled).toBe(false);
  });

  it('shows an error alert when saving fails', async () => {
    updateConfig.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<HomeCategoriesScreen />);
    await screen.findByText('All categories');

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(alertSpy).toHaveBeenCalledWith('Could not save', 'Try again.', undefined);
  });
});
