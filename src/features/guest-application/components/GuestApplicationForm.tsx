import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import type { SubmitGuestApplicationInput } from '@/features/guest-application/hooks/useSubmitGuestApplication';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { StringListEditor } from '@/shared/components/StringListEditor';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SOCIAL_LINKS = 3;

type Props = {
  initialName: string;
  email: string;
  submitting: boolean;
  onSubmit: (input: SubmitGuestApplicationInput) => void;
};

/**
 * The "Be a Podcast Guest" application form (Settings → Community). Email
 * is the account's verified address, shown read-only (spec §4) — editing it
 * here would not change the account and only invite confusion.
 */
export function GuestApplicationForm({ initialName, email, submitting, onSubmit }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState('');
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const validateLink = (value: string): string | null => {
    if (!/^https?:\/\/.+/i.test(value)) return t('guestApplication.validationLinkInvalid');
    return null;
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError(t('guestApplication.validationNameRequired'));
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!trimmedMessage) {
      setMessageError(t('guestApplication.validationMessageRequired'));
      hasError = true;
    } else {
      setMessageError(null);
    }

    if (hasError) return;

    onSubmit({ name: trimmedName, email, message: trimmedMessage, socialLinks });
  };

  return (
    <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedText type="default" themeColor="textSecondary">
          {t('guestApplication.formIntro')}
        </ThemedText>

        <TextField
          label={t('guestApplication.nameLabel')}
          value={name}
          onChangeText={setName}
          error={nameError ?? undefined}
          autoCorrect={false}
        />

        <TextField label={t('guestApplication.emailLabel')} value={email} editable={false} />

        <ThemedView style={styles.messageField}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('guestApplication.messageLabel')}
          </ThemedText>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('guestApplication.messagePlaceholder')}
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            style={[
              styles.textArea,
              { color: theme.textPrimary, borderColor: messageError ? theme.destructive : theme.border, backgroundColor: theme.surface },
            ]}
          />
          {messageError ? (
            <ThemedText type="small" themeColor="destructive">
              {messageError}
            </ThemedText>
          ) : null}
        </ThemedView>

        <StringListEditor
          label={t('guestApplication.socialLinksLabel')}
          values={socialLinks}
          onChange={setSocialLinks}
          maxItems={MAX_SOCIAL_LINKS}
          placeholder={t('guestApplication.linkPlaceholder')}
          addLabel={t('guestApplication.addLink')}
          validate={validateLink}
          disabled={submitting}
        />

        <ThemedView style={styles.submit}>
          <PrimaryButton
            title={submitting ? t('common.saving') : t('guestApplication.submit')}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  messageField: { gap: Spacing.one, width: '100%' },
  textArea: {
    width: '100%',
    height: 160,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  submit: { marginTop: Spacing.two },
});
