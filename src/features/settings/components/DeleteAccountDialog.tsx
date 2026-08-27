import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type Props = {
  visible: boolean;
  username: string | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Type-to-confirm delete — per .docs/SETTINGS_REDESIGN.md, deleting an
 * account is "never a single tap." The confirm button stays disabled until
 * the typed text exactly matches the current username.
 */
export function DeleteAccountDialog({ visible, username, submitting, onCancel, onConfirm }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');

  const canConfirm = Boolean(username) && typed === username && !submitting;

  const handleClose = () => {
    setTyped('');
    onCancel();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <ThemedView style={styles.backdrop}>
        <ThemedView type="surface" style={[styles.card, { borderColor: theme.destructiveBorder }]}>
          <ThemedText type="subtitle" themeColor="destructive">
            {t('settings.deleteAccount')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('settings.deleteDialogWarning')}
          </ThemedText>

          {username ? (
            <TextField
              label={t('settings.deleteDialogConfirmLabel', { username })}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={username}
            />
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={handleClose} style={styles.cancelButton}>
              <ThemedText type="smallBold" themeColor="textPrimary">
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={!canConfirm}
              onPress={onConfirm}
              style={[
                styles.confirmButton,
                { backgroundColor: canConfirm ? theme.destructive : theme.surfaceElevated },
              ]}>
              <ThemedText type="smallBold" themeColor={canConfirm ? 'textPrimary' : 'textDisabled'}>
                {submitting ? t('settings.deleting') : t('settings.deleteDialogButton')}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
  },
  card: {
    borderRadius: RADII.card,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.control,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.control,
  },
});
