import { renderHook } from '@testing-library/react-native';

import { useTheme } from '@/shared/hooks/use-theme';
import { Colors } from '@/shared/constants/theme';

describe('useTheme', () => {
  it('returns the dark palette as a passthrough', async () => {
    const { result } = await renderHook(() => useTheme());

    expect(result.current).toBe(Colors);
    expect(result.current.primary).toBe('#F5C518');
  });
});
