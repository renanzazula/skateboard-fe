import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('only takes the latest value once it has been stable for the delay', async () => {
    const { result, rerender } = await renderHook(({ value }: { value: string }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    });

    await rerender({ value: '4' });
    await act(() => jest.advanceTimersByTime(200));
    await rerender({ value: '42' });
    await act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('');

    await act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('42');
  });
});
