import { router } from 'expo-router';

import { openNotificationTarget } from '@/features/notifications/pushNavigation';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const mockPush = router.push as jest.Mock;

describe('openNotificationTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when data is undefined', () => {
    openNotificationTarget(undefined);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to the podcast video route by slug', () => {
    openNotificationTarget({ targetType: 'PODCAST', targetSlug: 'my-episode' });

    expect(mockPush).toHaveBeenCalledWith('/video/my-episode');
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
