import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import type { SaveGuestApplicationSettingsInput } from '@/features/guest-application/hooks/useGuestApplicationSettingsAdmin';
import type { GuestApplicationSettings } from '@/features/guest-application/types';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { StringListEditor } from '@/shared/components/StringListEditor';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

const MAX_RECIPIENTS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  initialSettings: GuestApplicationSettings;
  submitting: boolean;
  onSubmit: (input: SaveGuestApplicationSettingsInput) => void;
};

/**
 * Admin form for the Guest Application feature toggle and recipients.
 * Recipients are entered as raw Keycloak user ids (V1 — see
 * .docs/README_GUEST_APPLICATION_lang.md §6): the BFF has no "search users
 * by name" endpoint today, only skateboard-user-be's resolve-by-id lookup,
 * which this screen doesn't call. The confirmation/admin-notification email
 * copy that used to live on this form moved to the Email Templates admin
 * screen (settings/email-templates-admin.tsx).
 */
export function GuestApplicationSettingsForm({ initialSettings, submitting, onSubmit }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [recipientIds, setRecipientIds] = useState<string[]>(initialSettings.recipientIds);

  const validateRecipient = (value: string): string | null => {
    if (!UUID_PATTERN.test(value)) return t('admin.guestApplicationSettings.validationInvalidId');
    return null;
  };

  const handleSubmit = () => {
    if (enabled && recipientIds.length === 0) {
      showAlert(t('common.error'), t('admin.guestApplicationSettings.validationRecipientRequired'));
      return;
    }

    onSubmit({ enabled, recipientIds });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.toggleRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <View style={styles.toggleText}>
          <ThemedText type="smallBold">{t('admin.guestApplicationSettings.enabledLabel')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('admin.guestApplicationSettings.enabledSubtitle')}
          </ThemedText>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: theme.toggleTrackOff, true: theme.primary }}
          thumbColor={enabled ? theme.toggleThumbOn : theme.toggleThumbOff}
        />
      </View>

      <StringListEditor
        label={t('admin.guestApplicationSettings.recipientsLabel')}
        values={recipientIds}
        onChange={setRecipientIds}
        maxItems={MAX_RECIPIENTS}
        placeholder={t('admin.guestApplicationSettings.recipientPlaceholder')}
        addLabel={t('admin.guestApplicationSettings.addRecipient')}
        validate={validateRecipient}
        disabled={submitting}
      />

      <ThemedView style={styles.submit}>
        <PrimaryButton
          title={submitting ? t('common.saving') : t('common.save')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  toggleText: { flex: 1, gap: 2 },
  submit: { marginTop: Spacing.three },
});
