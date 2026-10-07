import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { useEmailTemplatesAdmin } from '@/features/email-templates/hooks/useEmailTemplatesAdmin';
import type { EmailTemplate } from '@/features/email-templates/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { SkateLoader } from '@/shared/components/loader';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { SecondaryButton } from '@/shared/components/SecondaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_CONTENT_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { LANGUAGE_LABELS, type Language } from '@/shared/locales';
import { showAlert } from '@/shared/utils/alert';

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 4000;

/**
 * Settings → Administration → Email Templates. Gated by
 * FUNC_EMAIL_TEMPLATE_MANAGE. Lists every (type, language) row the list
 * endpoint materializes (two types × three languages = six rows today) and
 * edits one at a time through a modal — same list+modal shape as
 * manage-categories.tsx, scaled to a subject+body form instead of a single
 * rename field.
 */
export default function EmailTemplatesAdminScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasAuthority } = useAuth();
  const { submitting, listTemplates, updateTemplate } = useEmailTemplatesAdmin();

  const canManage = hasAuthority('FUNC_EMAIL_TEMPLATE_MANAGE');

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await listTemplates());
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setLoading(false);
    }
    // listTemplates is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) return <Redirect href="/settings" />;

  const openEditor = (template: EmailTemplate) => {
    setEditing(template);
    setSubject(template.subject);
    setBody(template.body);
    setEnabled(template.enabled);
  };

  const closeEditor = () => setEditing(null);

  const handleSave = async () => {
    if (!editing) return;
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody) {
      showAlert(t('common.error'), t('admin.emailTemplates.validationRequired'));
      return;
    }
    try {
      const updated = await updateTemplate(editing.id, { subject: trimmedSubject, body: trimmedBody, enabled });
      setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditing(null);
      showAlert(t('common.success'), t('admin.emailTemplates.saved'));
    } catch (saveError) {
      showAlert(t('admin.emailTemplates.saveError'), isBffError(saveError) ? saveError.message : t('common.tryAgain'));
    }
  };

  const typeLabel = (template: EmailTemplate) => t(`admin.emailTemplates.types.${template.type}`);
  const languageLabel = (template: EmailTemplate) => LANGUAGE_LABELS[template.language as Language] ?? template.language;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.emailTemplates.title')} />
        <SkateLoader fullScreen />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SettingsHeader title={t('admin.emailTemplates.title')} />
        <ErrorBanner message={isBffError(error) ? error.message : t('admin.emailTemplates.loadError')} onRetry={load} />
      </ThemedView>
    );
  }

  const renderRow = ({ item }: { item: EmailTemplate }) => (
    <Pressable
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => openEditor(item)}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel(item)} — ${languageLabel(item)}`}>
      <View style={styles.rowHeader}>
        <ThemedText type="smallBold">{typeLabel(item)}</ThemedText>
        <View style={[styles.languageTag, { backgroundColor: theme.primarySoft }]}>
          <ThemedText type="small" themeColor="primary">
            {languageLabel(item)}
          </ThemedText>
        </View>
        {!item.enabled ? (
          <ThemedText type="small" themeColor="textMuted">
            {t('admin.emailTemplates.disabledTag')}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {item.subject}
      </ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <SettingsHeader title={t('admin.emailTemplates.title')} />
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={RowSeparator}
      />

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            {editing ? (
              <ThemedText type="smallBold">{`${typeLabel(editing)} — ${languageLabel(editing)}`}</ThemedText>
            ) : null}

            <View style={styles.toggleRow}>
              <ThemedText type="small">{t('admin.emailTemplates.enabledLabel')}</ThemedText>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: theme.toggleTrackOff, true: theme.primary }}
                thumbColor={enabled ? theme.toggleThumbOn : theme.toggleThumbOff}
              />
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.emailTemplates.subjectLabel')}
            </ThemedText>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              maxLength={MAX_SUBJECT_LENGTH}
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
            />

            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.emailTemplates.bodyLabel')}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {t('admin.emailTemplates.bodyHint')}
            </ThemedText>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={MAX_BODY_LENGTH}
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                styles.textArea,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            />

            <PrimaryButton
              title={submitting ? t('common.saving') : t('common.save')}
              onPress={handleSave}
              loading={submitting}
              disabled={submitting}
            />
            <SecondaryButton title={t('common.cancel')} onPress={closeEditor} disabled={submitting} />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// Extracted so it isn't redefined on every render (typescript:S6478).
function RowSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: Spacing.three,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  row: {
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  languageTag: {
    borderRadius: RADII.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  separator: { height: Spacing.two },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: { height: 160, textAlignVertical: 'top' },
});
