import { router } from 'expo-router';
import { render, screen, userEvent } from '@testing-library/react-native';

import LanguageScreen from '@/app/(tabs)/settings/language';
import { useLocalSettings } from '@/features/settings/hooks/useLocalSettings';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

jest.mock('@/features/settings/hooks/useLocalSettings', () => ({
  useLocalSettings: jest.fn(),
  LANGUAGES: ['en', 'es', 'pt'],
  LANGUAGE_FLAGS: { en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷' },
  LANGUAGE_LABELS: { en: 'English', es: 'Español', pt: 'Português' },
}));

const mockUseLocalSettings = useLocalSettings as jest.Mock;
const mockRouterBack = router.back as jest.Mock;

describe('LanguageScreen', () => {
  const selectLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSettings.mockReturnValue({ language: 'en', selectLanguage });
  });

  it('lists every language option and checks the current one', async () => {
    await render(<LanguageScreen />);

    expect(screen.getByText(/English/)).toBeTruthy();
    expect(screen.getByText(/Español/)).toBeTruthy();
    expect(screen.getByText(/Português/)).toBeTruthy();
  });

  it('selects a language and navigates back', async () => {
    const user = userEvent.setup();
    await render(<LanguageScreen />);

    await user.press(screen.getByText(/Español/));

    expect(selectLanguage).toHaveBeenCalledWith('es');
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
