import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { LicensesView } from '@/features/licenses/components/LicensesView';
import type { SaveLicensesInput } from '@/features/licenses/hooks/useLicensesAdmin';
import type { Licenses, LicensesStatus } from '@/features/licenses/types';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

const STATUSES: LicensesStatus[] = ['draft', 'published'];

interface Props {
  initialPage: Licenses | null;
  submitting: boolean;
  onSubmit: (values: SaveLicensesInput) => void;
}

export function LicensesForm({ initialPage, submitting, onSubmit }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [title, setTitle] = useState(initialPage?.title ?? '');
  const [body, setBody] = useState(initialPage?.body ?? '');
  const [status, setStatus] = useState<LicensesStatus>(initialPage?.status ?? 'draft');
  const [preview, setPreview] = useState(false);

  const inputStyle = [
    styles.input,
    { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background },
  ];

  const previewPage = useMemo<Licenses>(
    () => ({
      title: title.trim() || t('licenses.title'),
      body,
      status,
      updatedAt: initialPage?.updatedAt ?? null,
      updatedBy: initialPage?.updatedBy ?? null,
    }),
    [title, body, status, initialPage, t]
  );

  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert(t('common.error'), t('admin.licenses.validationTitleRequired'));
      return;
    }
    if (!body.trim()) {
      showAlert(t('common.error'), t('admin.licenses.validationBodyRequired'));
      return;
    }
    onSubmit({ title: title.trim(), body: body.trim(), status });
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.toggleRow}>
            <Pressable onPress={() => setPreview(false)}>
              <ThemedView type={preview ? 'surface' : 'primarySoft'} style={styles.statusChip}>
                <ThemedText type="small" themeColor={preview ? 'textSecondary' : 'primary'}>
                  {t('admin.licenses.tabEdit')}
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={() => setPreview(true)}>
              <ThemedView type={preview ? 'primarySoft' : 'surface'} style={styles.statusChip}>
                <ThemedText type="small" themeColor={preview ? 'primary' : 'textSecondary'}>
                  {t('admin.licenses.tabPreview')}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>

          {preview ? (
            <LicensesView page={previewPage} preview />
          ) : (
            <>
              <ThemedText type="small">{t('admin.licenses.pageTitle')}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('licenses.title')}
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />

              <ThemedText type="small">{t('admin.licenses.bodyLabel')}</ThemedText>
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                placeholderTextColor={theme.textMuted}
                style={[inputStyle, styles.textArea]}
              />

              <ThemedText type="small">{t('admin.licenses.status')}</ThemedText>
              <View style={styles.statusRow}>
                {STATUSES.map((value) => {
                  const selected = value === status;
                  return (
                    <Pressable key={value} onPress={() => setStatus(value)}>
                      <ThemedView type={selected ? 'primarySoft' : 'surface'} style={styles.statusChip}>
                        <ThemedText type="small" themeColor={selected ? 'primary' : 'textSecondary'}>
                          {t(`admin.licenses.status_${value}`)}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.submit}>
            <PrimaryButton
              title={status === 'published' ? t('admin.licenses.saveAndPublish') : t('admin.licenses.saveDraft')}
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flexFill: { flex: 1 },
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_FORM_WIDTH,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: { height: 260, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  statusRow: { flexDirection: 'row', gap: Spacing.two },
  statusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.pill,
  },
  submit: { marginTop: Spacing.three },
});
