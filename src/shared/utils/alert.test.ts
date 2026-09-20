import { Alert, Platform } from 'react-native';

import { showAlert } from '@/shared/utils/alert';

describe('showAlert', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    jest.restoreAllMocks();
  });

  it('delegates to Alert.alert on native platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const buttons = [{ text: 'OK' }];

    showAlert('Title', 'Message', buttons);

    expect(alertSpy).toHaveBeenCalledWith('Title', 'Message', buttons);
  });

  describe('on web', () => {
    // The jest-expo/node test environment's `window` has no alert/confirm
    // (they're browser-only), so they must be defined before they can be
    // spied on — plain `jest.spyOn` throws "Property does not exist".
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
      (window as unknown as { alert: (msg: string) => void }).alert = jest.fn();
      (window as unknown as { confirm: (msg: string) => boolean }).confirm = jest.fn();
    });

    it('uses window.alert and fires the single button onPress when there are 0-1 buttons', () => {
      const onPress = jest.fn();

      showAlert('Title', 'Message', [{ text: 'OK', onPress }]);

      expect(window.alert).toHaveBeenCalledWith('Title\n\nMessage');
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('uses window.alert with just the title when there is no message and no buttons', () => {
      showAlert('Title only');

      expect(window.alert).toHaveBeenCalledWith('Title only');
    });

    it('uses window.confirm and fires the non-cancel button onPress when confirmed', () => {
      (window.confirm as jest.Mock).mockReturnValue(true);
      const cancelPress = jest.fn();
      const confirmPress = jest.fn();

      showAlert('Delete?', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel', onPress: cancelPress },
        { text: 'Delete', style: 'destructive', onPress: confirmPress },
      ]);

      expect(confirmPress).toHaveBeenCalledTimes(1);
      expect(cancelPress).not.toHaveBeenCalled();
    });

    it('fires the cancel button onPress when the confirm dialog is dismissed', () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      const cancelPress = jest.fn();
      const confirmPress = jest.fn();

      showAlert('Delete?', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel', onPress: cancelPress },
        { text: 'Delete', style: 'destructive', onPress: confirmPress },
      ]);

      expect(cancelPress).toHaveBeenCalledTimes(1);
      expect(confirmPress).not.toHaveBeenCalled();
    });
  });
});
