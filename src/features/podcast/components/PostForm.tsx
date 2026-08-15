import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import {
  BLOCK_TYPES,
  blockToEditor,
  defaultEditor,
  isValidUrl,
  toBlock,
  type BlockEditor,
} from '@/features/podcast/utils/blockEditor';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';
import type { Block, SocialMediaLink } from '@/shared/types/posts';

export interface PostFormValues {
  title: string;
  coverUrl: string;
  status: 'draft' | 'scheduled' | 'published';
  blocks: Block[];
  socialMediaLinks?: SocialMediaLink[];
}

interface PostFormProps {
  initialValues?: Partial<PostFormValues>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: PostFormValues) => void;
}

type SocialLinkEditor = { url: string };

// Content blocks and social links exist in the BFF contract; this form
// covers the full editing surface documented in
// skateboard-ui-backend/.docs/POST_PODCAST_DOCUMENTATION.md, ported from
// rork-standard-app/expo's CreatePostScreen.tsx/EditPostScreen.tsx.
const STATUSES: PostFormValues['status'][] = ['draft', 'scheduled', 'published'];

function BlockEditorRow({
  editor,
  onChange,
  onRemove,
}: {
  editor: BlockEditor;
  onChange: (e: BlockEditor) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const inputStyle = [styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }];

  return (
    <ThemedView type="surface" style={[styles.blockRow, { borderColor: theme.border }]}>
      <ThemedView style={styles.blockRowHeader}>
        <ThemedText type="smallBold" themeColor="primary">
          {editor.type.charAt(0).toUpperCase() + editor.type.slice(1)}
        </ThemedText>
        <Pressable onPress={onRemove} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="destructive">
            ✕
          </ThemedText>
        </Pressable>
      </ThemedView>

      {editor.type === 'text' && (
        <>
          <ThemedText type="small">{t('feed.textContent')}</ThemedText>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={editor.html}
            onChangeText={(v) => onChange({ ...editor, html: v })}
            multiline
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {editor.type === 'image' && (
        <>
          <ThemedText type="small">{t('feed.imageUrl')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.url}
            onChangeText={(v) => onChange({ ...editor, url: v })}
            placeholder={t('feed.imageUrlPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
          <ThemedText type="small">{t('feed.imageCaption')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.caption}
            onChangeText={(v) => onChange({ ...editor, caption: v })}
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {editor.type === 'video' && (
        <>
          <ThemedText type="small">{t('feed.videoUrl')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.url}
            onChangeText={(v) => onChange({ ...editor, url: v })}
            placeholder={t('feed.videoUrlPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
        </>
      )}

      {editor.type === 'quote' && (
        <>
          <ThemedText type="small">{t('feed.quoteText')}</ThemedText>
          <TextInput
            style={[inputStyle, styles.textAreaSmall]}
            value={editor.text}
            onChangeText={(v) => onChange({ ...editor, text: v })}
            placeholder={t('feed.quoteTextPlaceholder')}
            placeholderTextColor={theme.textMuted}
            multiline
          />
          <ThemedText type="small">{t('feed.quoteAuthor')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.author}
            onChangeText={(v) => onChange({ ...editor, author: v })}
            placeholder={t('feed.quoteAuthorPlaceholder')}
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {editor.type === 'embed' && (
        <>
          <ThemedText type="small">{t('feed.embedUrl')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.rawUrl}
            onChangeText={(v) => onChange({ ...editor, rawUrl: v })}
            placeholder={t('feed.embedUrlPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
        </>
      )}

      {editor.type === 'gallery' && (
        <>
          <ThemedText type="small">{t('feed.galleryImages')} (one URL per line)</ThemedText>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={editor.urls}
            onChangeText={(v) => onChange({ ...editor, urls: v })}
            placeholder="https://example.com/image1.jpg"
            placeholderTextColor={theme.textMuted}
            multiline
            autoCapitalize="none"
          />
        </>
      )}

      {editor.type === 'link' && (
        <>
          <ThemedText type="small">{t('feed.linkUrl')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.url}
            onChangeText={(v) => onChange({ ...editor, url: v })}
            placeholder={t('feed.linkUrlPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
          <ThemedText type="small">{t('feed.linkTitle')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.title}
            onChangeText={(v) => onChange({ ...editor, title: v })}
            placeholder={t('feed.linkTitlePlaceholder')}
            placeholderTextColor={theme.textMuted}
          />
          <ThemedText type="small">{t('feed.linkDescription')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.description}
            onChangeText={(v) => onChange({ ...editor, description: v })}
            placeholder={t('feed.linkDescriptionPlaceholder')}
            placeholderTextColor={theme.textMuted}
            multiline
          />
        </>
      )}

      {editor.type === 'spotify' && (
        <>
          <ThemedText type="small">{t('feed.spotifyUrl')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={editor.url}
            onChangeText={(v) => onChange({ ...editor, url: v })}
            placeholder={t('feed.spotifyUrlPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
        </>
      )}
    </ThemedView>
  );
}

export function PostForm({ initialValues, submitLabel, submitting, onSubmit }: PostFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? '');
  const [coverSource, setCoverSource] = useState<'url' | 'upload'>('url');
  const [status, setStatus] = useState<PostFormValues['status']>(initialValues?.status ?? 'published');
  const [blockEditors, setBlockEditors] = useState<BlockEditor[]>(
    initialValues?.blocks?.map(blockToEditor) ?? []
  );
  const [socialLinks, setSocialLinks] = useState<SocialLinkEditor[]>(
    initialValues?.socialMediaLinks?.map((l) => ({ url: l.url })) ?? []
  );

  const canSubmit = title.trim().length > 0 && coverUrl.trim().length > 0 && !submitting;

  const handleAddBlock = (type: BlockEditor['type']) => {
    setBlockEditors((prev) => [...prev, defaultEditor(type)]);
  };

  const handleBlockChange = (i: number, editor: BlockEditor) => {
    setBlockEditors((prev) => prev.map((e, idx) => (idx === i ? editor : e)));
  };

  const handleBlockRemove = (i: number) => {
    setBlockEditors((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.base64) {
      setCoverUrl(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert(t('common.error'), t('feed.validationTitleRequired'));
      return;
    }
    if (!coverUrl.trim()) {
      showAlert(t('common.error'), t('feed.validationCoverRequired'));
      return;
    }
    const blocks = blockEditors.map(toBlock).filter((b): b is Block => b !== null);
    if (blocks.length === 0) {
      showAlert(t('common.error'), t('feed.validationBlockRequired'));
      return;
    }
    for (const link of socialLinks) {
      if (!isValidUrl(link.url)) {
        showAlert(t('common.error'), t('feed.validationInvalidUrl'));
        return;
      }
    }
    const socialMediaLinks: SocialMediaLink[] = socialLinks.map((l) => ({ url: l.url.trim() }));

    onSubmit({
      title: title.trim(),
      coverUrl: coverUrl.trim(),
      status,
      blocks,
      socialMediaLinks: socialMediaLinks.length > 0 ? socialMediaLinks : undefined,
    });
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ThemedText type="small">{t('feed.postTitle')}</ThemedText>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('feed.postTitlePlaceholder')}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
      />

      <ThemedText type="small">{t('feed.coverImageUrl')}</ThemedText>
      <ThemedView style={styles.coverSourceRow}>
        {(['url', 'upload'] as const).map((source) => (
          <Pressable key={source} onPress={() => setCoverSource(source)}>
            <ThemedView type={coverSource === source ? 'primarySoft' : 'surface'} style={styles.statusChip}>
              <ThemedText type="small" themeColor={coverSource === source ? 'primary' : 'textSecondary'}>
                {source === 'url' ? 'URL' : t('feed.coverImageUpload')}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>
      {coverSource === 'url' ? (
        <TextInput
          value={coverUrl}
          onChangeText={setCoverUrl}
          placeholder={t('feed.coverImageUrlPlaceholder')}
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
        />
      ) : (
        <Pressable onPress={handlePickImage}>
          <ThemedView type="surface" style={styles.uploadButton}>
            <ThemedText type="small">
              {coverUrl.startsWith('data:') ? 'Image selected ✓' : t('feed.coverImageUpload')}
            </ThemedText>
          </ThemedView>
        </Pressable>
      )}

      <ThemedText type="small">{t('feed.status')}</ThemedText>
      <ThemedView style={styles.statusRow}>
        {STATUSES.map((value) => {
          const selected = value === status;
          return (
            <Pressable key={value} onPress={() => setStatus(value)}>
              <ThemedView type={selected ? 'primarySoft' : 'surface'} style={styles.statusChip}>
                <ThemedText type="small" themeColor={selected ? 'primary' : 'textSecondary'}>
                  {value}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>

      <ThemedText type="small" style={styles.sectionLabel}>
        {t('feed.socialMediaLinks')}
      </ThemedText>
      {socialLinks.map((link, i) => (
        <ThemedView key={i} type="surface" style={[styles.blockRow, { borderColor: theme.border }]}>
          <ThemedView style={styles.blockRowHeader}>
            <ThemedText type="smallBold" themeColor="primary">
              {t('feed.socialUrl')}
            </ThemedText>
            <Pressable onPress={() => setSocialLinks((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="destructive">
                ✕
              </ThemedText>
            </Pressable>
          </ThemedView>
          <TextInput
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
            value={link.url}
            onChangeText={(v) => setSocialLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, url: v } : l)))}
            placeholder={t('feed.socialUrlPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
        </ThemedView>
      ))}
      <Pressable onPress={() => setSocialLinks((prev) => [...prev, { url: '' }])}>
        <ThemedView type="surface" style={[styles.addBlockButton, { borderColor: theme.primary }]}>
          <ThemedText type="small" themeColor="primary">
            + {t('feed.addSocialLink')}
          </ThemedText>
        </ThemedView>
      </Pressable>

      <ThemedText type="small" style={styles.sectionLabel}>
        {t('feed.contentBlocks')}
      </ThemedText>
      {blockEditors.map((editor, i) => (
        <BlockEditorRow
          key={i}
          editor={editor}
          onChange={(e) => handleBlockChange(i, e)}
          onRemove={() => handleBlockRemove(i)}
        />
      ))}

      <ThemedView style={styles.blockButtons}>
        {BLOCK_TYPES.map(({ type, label }) => (
          <Pressable key={type} onPress={() => handleAddBlock(type)}>
            <ThemedView type="surface" style={[styles.addBlockButton, { borderColor: theme.primary }]}>
              <ThemedText type="small" themeColor="primary">
                + {label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>

      <Pressable disabled={!canSubmit} onPress={handleSubmit}>
        <ThemedView type={canSubmit ? 'primary' : 'surface'} style={styles.submitButton}>
          <ThemedText type="smallBold" themeColor={canSubmit ? 'onPrimary' : 'textDisabled'}>
            {submitting ? 'Saving…' : submitLabel}
          </ThemedText>
        </ThemedView>
      </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    height: 80,
    textAlignVertical: 'top',
  },
  coverSourceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  uploadButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.pill,
  },
  sectionLabel: {
    marginTop: Spacing.three,
  },
  blockRow: {
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  blockRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  blockButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  addBlockButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.control,
    borderWidth: 1,
  },
  submitButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
});
