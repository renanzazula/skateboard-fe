import { router, useRootNavigationState } from 'expo-router';
import { act, renderHook } from '@testing-library/react-native';

import {
  getPendingNotificationTarget,
  openNotificationTarget,
  parseNotificationTarget,
  setPendingNotificationTarget,
  useOpenPendingNotificationTarget,
} from '@/features/notifications/pushNavigation';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useRootNavigationState: jest.fn(),
}));

const mockPush = router.push as jest.Mock;
const mockUseRootNavigationState = useRootNavigationState as jest.Mock;

const EPISODE = { targetType: 'PODCAST', targetSlug: 'my-episode' };

describe('parseNotificationTarget', () => {
  it('accepts a podcast target with a slug', () => {
    expect(parseNotificationTarget({ ...EPISODE, targetId: 'p1', notificationId: 'n1' })).toEqual({
      targetType: 'PODCAST',
      targetSlug: 'my-episode',
      targetId: 'p1',
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a non-object', 'PODCAST'],
    ['no slug', { targetType: 'PODCAST' }],
    ['an empty slug', { targetType: 'PODCAST', targetSlug: '' }],
    ['a non-string slug', { targetType: 'PODCAST', targetSlug: 42 }],
    ['a path-like slug', { targetType: 'PODCAST', targetSlug: '../settings' }],
    ['an uppercase slug', { targetType: 'PODCAST', targetSlug: 'My-Episode' }],
    ['an unknown target type', { targetType: 'SOMETHING_NEW', targetSlug: 'x' }],
  ])('rejects %s', (_label, data) => {
    expect(parseNotificationTarget(data)).toBeNull();
  });
});

describe('openNotificationTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when data is undefined', () => {
    openNotificationTarget(undefined);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to the podcast video route by slug, tagged with its source', () => {
    openNotificationTarget(EPISODE, 'push');

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/video/[slug]',
      params: { slug: 'my-episode', source: 'push' },
    });
  });

  it('defaults the source to the inbox', () => {
    openNotificationTarget(EPISODE);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/video/[slug]',
      params: { slug: 'my-episode', source: 'inbox' },
    });
  });

  it('does nothing for a PODCAST target with no slug', () => {
    openNotificationTarget({ targetType: 'PODCAST' });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does nothing for an unknown target type', () => {
    openNotificationTarget({ targetType: 'SOMETHING_NEW', targetSlug: 'x' });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('useOpenPendingNotificationTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPendingNotificationTarget(null);
    mockUseRootNavigationState.mockReturnValue({ key: 'root' });
  });

  it('waits until the app can navigate, then opens the target once', async () => {
    setPendingNotificationTarget(EPISODE);
    const { rerender } = await renderHook(({ ready }) => useOpenPendingNotificationTarget(ready), {
      initialProps: { ready: false },
    });
    expect(mockPush).not.toHaveBeenCalled();

    await rerender({ ready: true });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/video/[slug]',
      params: { slug: 'my-episode', source: 'push' },
    });
    expect(getPendingNotificationTarget()).toBeNull();

    await rerender({ ready: true });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('waits for the root navigator to mount', async () => {
    mockUseRootNavigationState.mockReturnValue(undefined);
    setPendingNotificationTarget(EPISODE);
    const { rerender } = await renderHook(() => useOpenPendingNotificationTarget(true));
    expect(mockPush).not.toHaveBeenCalled();

    mockUseRootNavigationState.mockReturnValue({ key: 'root' });
    await rerender({});

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('opens a tap that arrives while the app is already running', async () => {
    await renderHook(() => useOpenPendingNotificationTarget(true));
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => setPendingNotificationTarget(EPISODE));

    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
