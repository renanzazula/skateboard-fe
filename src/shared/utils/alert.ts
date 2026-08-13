import type { AlertButton } from 'react-native';
import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op in react-native-web; fall back to window.alert /
// window.confirm so web users still get feedback and confirm dialogs work.
// Web can only offer OK/Cancel, so with 2+ buttons the last non-cancel button
// is treated as the affirmative action; choosers with 3+ options need their
// own web UI.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = [...buttons].reverse().find((b) => b.style !== 'cancel');
  if (window.confirm(text)) {
    actionButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
