import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AppConfigProvider } from '@/core/config/AppConfigProvider';
import { bootstrap } from '@/core/config/appConfigStore';

jest.mock('@/core/config/appConfigStore', () => ({
  bootstrap: jest.fn(),
}));

const mockBootstrap = bootstrap as jest.Mock;

describe('AppConfigProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kicks off bootstrap once on mount and renders its children', async () => {
    await render(
      <AppConfigProvider>
        <Text>child content</Text>
      </AppConfigProvider>
    );

    expect(screen.getByText('child content')).toBeTruthy();
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });
});
