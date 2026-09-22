import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AuthProvider } from '@/core/auth/AuthProvider';
import { bootstrap } from '@/core/auth/authStore';

jest.mock('@/core/auth/authStore', () => ({
  bootstrap: jest.fn(),
}));

const mockBootstrap = bootstrap as jest.Mock;

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kicks off bootstrap once on mount and renders its children', async () => {
    await render(
      <AuthProvider>
        <Text>child content</Text>
      </AuthProvider>
    );

    expect(screen.getByText('child content')).toBeTruthy();
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });
});
