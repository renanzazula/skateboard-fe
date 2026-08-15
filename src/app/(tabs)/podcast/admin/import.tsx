import { Redirect } from 'expo-router';
import { FileJson, Upload } from 'lucide-react-native';
import { useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { usePodcastImport } from '@/features/podcast/hooks/usePodcastImport';
import { isBffError } from '@/shared/api/errors';
import { MAX_CONTENT_WIDTH } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

// Ported from rork-standard-app/expo's modules/feed/screens/PodcastImportScreen.tsx
// (via migrate/podcast/screens/PodcastImportScreen.tsx) — replaces the
// previous paste-JSON-textarea UI with a real file picker.

export default function ImportPodcastPostsScreen() {
  const { hasAuthority } = useAuth();
  const colors = useTheme();
  const { t } = useTranslation();
  const { episodes, fileName, submitting, pickNativeFile, handleWebFile, submitEpisodes } = usePodcastImport();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!hasAuthority('FUNC_PODCAST_IMPORT_JSON')) {
    return <Redirect href="/podcast" />;
  }

  const handleSelectFile = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    try {
      await pickNativeFile();
    } catch {
      showAlert(t('common.error'), t('podcast.importInvalidJson'));
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await handleWebFile(file);
    } catch {
      showAlert(t('common.error'), t('podcast.importInvalidJson'));
    }
  };

  const handleImport = async () => {
    if (episodes.length === 0) return;
    const count = episodes.length;
    try {
      const result = await submitEpisodes();
      const imported = result.imported ?? 0;
      if (imported === count) {
        showAlert(t('common.success'), t('podcast.importSuccess').replace('{imported}', String(imported)));
      } else {
        showAlert(
          t('common.success'),
          t('podcast.importPartial').replace('{imported}', String(imported)).replace('{failed}', String(count - imported))
        );
      }
    } catch (importError) {
      showAlert(t('common.error'), isBffError(importError) ? importError.message : t('podcast.importFailed'));
    }
  };

  const preview = episodes.slice(0, 3);
  const hasFile = episodes.length > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {Platform.OS === 'web' && (
        // @ts-ignore web-only element
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleWebFileChange as any}
        />
      )}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('podcast.importJsonSection')}</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: hasFile ? 1 : 0 }]}>
          <View style={styles.rowIcon}>
            <FileJson size={22} color={colors.primary} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('podcast.importJson')}</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              {fileName
                ? t('podcast.fileSelected').replace('{count}', String(episodes.length)).replace('{name}', fileName)
                : t('podcast.importJsonDescription')}
            </Text>
          </View>
        </View>

        {hasFile && (
          <View style={styles.previewContainer}>
            <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>Preview</Text>
            {preview.map((ep, i) => (
              <View
                key={i}
                style={[
                  styles.previewItem,
                  { borderBottomColor: colors.border, borderBottomWidth: i < preview.length - 1 ? 1 : 0 },
                ]}>
                <Text style={[styles.previewItemText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {ep.title}
                </Text>
                {ep.publishAt ? (
                  <Text style={[styles.previewItemMeta, { color: colors.textSecondary }]}>{ep.publishAt.slice(0, 10)}</Text>
                ) : null}
              </View>
            ))}
            {episodes.length > 3 && (
              <Text style={[styles.previewMore, { color: colors.textSecondary }]}>+{episodes.length - 3} more</Text>
            )}
          </View>
        )}
      </View>

      <Pressable style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleSelectFile}>
        <Upload size={18} color={colors.textPrimary} />
        <Text style={[styles.selectButtonText, { color: colors.textPrimary }]}>{t('podcast.selectJsonFile')}</Text>
      </Pressable>

      <Pressable
        style={[styles.importButton, { backgroundColor: !hasFile || submitting ? colors.border : colors.primary }]}
        onPress={handleImport}
        disabled={!hasFile || submitting}>
        <Text style={[styles.importButtonText, { color: colors.onPrimary }]}>
          {submitting ? t('podcast.importing') : t('podcast.importPosts').replace('{count}', String(episodes.length))}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  rowDescription: { fontSize: 13 },
  previewContainer: { padding: 16, paddingTop: 8 },
  previewTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewItem: { paddingVertical: 8 },
  previewItemText: { fontSize: 13, fontWeight: '600' },
  previewItemMeta: { fontSize: 12, marginTop: 2 },
  previewMore: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectButtonText: { fontSize: 16, fontWeight: '600' },
  importButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: { fontSize: 16, fontWeight: '700' },
});
