import { Alert } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import ManageCategoriesScreen from '@/app/(tabs)/settings/manage-categories';
import { useAuth } from '@/core/auth';
import { useCategoryAdmin } from '@/features/podcast/hooks/useCategoryAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/podcast/hooks/useCategoryAdmin', () => ({
  useCategoryAdmin: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseCategoryAdmin = useCategoryAdmin as jest.Mock;

const CATEGORIES = [
  { id: 'c1', name: 'Tricks', slug: 'tricks', default: true, enabled: true, postCount: 5, youtubeName: 'Tricks' },
  { id: 'c2', name: 'News', slug: 'news', default: false, enabled: true, postCount: 2, youtubeName: 'News' },
];

describe('ManageCategoriesScreen', () => {
  const listCategories = jest.fn();
  const renameCategory = jest.fn();
  const reorderCategories = jest.fn();
  const setDefaultCategory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    mockUseCategoryAdmin.mockReturnValue({
      submitting: false,
      listCategories,
      renameCategory,
      reorderCategories,
      setDefaultCategory,
    });
    listCategories.mockResolvedValue(CATEGORIES);
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    await render(<ManageCategoriesScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows an error banner with retry when loading fails', async () => {
    listCategories.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);

    expect(await screen.findByText('Could not load categories.')).toBeTruthy();
    listCategories.mockResolvedValueOnce(CATEGORIES);
    await user.press(screen.getByText('Retry'));

    expect(await screen.findByText('Tricks')).toBeTruthy();
  });

  it('lists categories with episode counts and the default tag', async () => {
    await render(<ManageCategoriesScreen />);

    expect(await screen.findByText('Tricks')).toBeTruthy();
    expect(screen.getByText('News')).toBeTruthy();
    expect(screen.getByText('DEFAULT')).toBeTruthy();
    expect(screen.getByText('5 episodes')).toBeTruthy();
  });

  it('makes a category the default', async () => {
    setDefaultCategory.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('News');

    await user.press(screen.getByLabelText('Make News the default'));

    expect(setDefaultCategory).toHaveBeenCalledWith('c2');
  });

  it('shows an error alert when setting default fails', async () => {
    setDefaultCategory.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('News');

    await user.press(screen.getByLabelText('Make News the default'));

    expect(alertSpy).toHaveBeenCalledWith('Could not set default', 'Try again.', undefined);
  });

  it('moves a category down, persisting the new order', async () => {
    reorderCategories.mockResolvedValueOnce([CATEGORIES[1], CATEGORIES[0]]);
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('Tricks');

    await user.press(screen.getByLabelText('Move Tricks down'));

    expect(reorderCategories).toHaveBeenCalledWith(['c2', 'c1']);
  });

  it('rolls back the order and shows an alert when reordering fails', async () => {
    reorderCategories.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('Tricks');

    await user.press(screen.getByLabelText('Move Tricks down'));

    expect(await screen.findByLabelText('Move Tricks down')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Could not reorder', 'Try again.', undefined);
  });

  it('renames a category through the modal', async () => {
    renameCategory.mockResolvedValueOnce({ ...CATEGORIES[1], name: 'Latest News', customName: true });
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('News');

    await user.press(screen.getByLabelText('Rename News'));
    const input = screen.getByPlaceholderText('News');
    await user.clear(input);
    await user.type(input, 'Latest News');
    await user.press(screen.getByText('Save'));

    expect(renameCategory).toHaveBeenCalledWith('c2', 'Latest News');
    expect(await screen.findByText('Latest News')).toBeTruthy();
  });

  it('resets a custom name back to the YouTube title', async () => {
    listCategories.mockResolvedValue([
      { ...CATEGORIES[1], name: 'Latest News', customName: true, youtubeName: 'News' },
    ]);
    renameCategory.mockResolvedValueOnce({ ...CATEGORIES[1], name: 'News', customName: false });
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('Latest News');

    await user.press(screen.getByLabelText('Rename Latest News'));
    await user.press(screen.getByText('Reset to YouTube title'));

    expect(renameCategory).toHaveBeenCalledWith('c2', null);
  });

  it('shows an error alert when renaming fails', async () => {
    renameCategory.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('News');

    await user.press(screen.getByLabelText('Rename News'));
    const input = screen.getByPlaceholderText('News');
    await user.clear(input);
    await user.type(input, 'Latest News');
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Could not rename', 'Try again.', undefined);
  });

  it('cancels out of the rename modal', async () => {
    const user = userEvent.setup();
    await render(<ManageCategoriesScreen />);
    await screen.findByText('News');

    await user.press(screen.getByLabelText('Rename News'));
    expect(screen.getByText('Rename category')).toBeTruthy();

    await user.press(screen.getByText('Cancel'));

    expect(renameCategory).not.toHaveBeenCalled();
  });
});
