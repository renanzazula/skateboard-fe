import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { I18nProvider } from '@/core/i18n/I18nProvider';
import { bootstrapLanguage } from '@/core/i18n/languageStore';

jest.mock('@/core/i18n/languageStore', () => ({
  bootstrapLanguage: jest.fn(),
}));

const mockBootstrapLanguage = bootstrapLanguage as jest.Mock;

describe('I18nProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kicks off bootstrapLanguage once on mount and renders its children', async () => {
    await render(
      <I18nProvider>
        <Text>child content</Text>
      </I18nProvider>
    );

    expect(screen.getByText('child content')).toBeTruthy();
    expect(mockBootstrapLanguage).toHaveBeenCalledTimes(1);
  });
});
