import * as ImagePicker from 'expo-image-picker';
import { ArrowDown, ArrowUp, Eye, EyeOff, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  ABOUT_BLOCK_TYPES,
  collectBlockUrls,
  defaultBlock,
  isValidUrl,
  moveItem,
  SOCIAL_PLATFORMS,
  type AboutBlockType,
} from '@/features/about/aboutBlocks';
import { AboutPageView } from '@/features/about/components/AboutPageView';
import type { SaveAboutPageInput } from '@/features/about/hooks/useAboutAdmin';
import type { AboutPage, AboutPageStatus, ContentBlock } from '@/features/about/types';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { SocialLinkItem } from '@/shared/types/content-blocks';
import { showAlert } from '@/shared/utils/alert';

const STATUSES: AboutPageStatus[] = ['draft', 'published'];

interface Props {
  initialPage: AboutPage | null;
  submitting: boolean;
  onSubmit: (values: SaveAboutPageInput) => void;
  /** Uploads a picked image and resolves to its hosted URL. */
  onUploadImage: (asset: ImagePicker.ImagePickerAsset) => Promise<string>;
}

async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to add an image.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

export function AboutForm({ initialPage, submitting, onSubmit, onUploadImage }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [title, setTitle] = useState(initialPage?.title ?? '');
  const [subtitle, setSubtitle] = useState(initialPage?.subtitle ?? '');
  const [status, setStatus] = useState<AboutPageStatus>(initialPage?.status ?? 'draft');
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialPage?.blocks ?? []);
  const [preview, setPreview] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const inputStyle = [
    styles.input,
    { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background },
  ];

  const previewPage = useMemo<AboutPage>(
    () => ({
      title: title.trim() || t('aboutUs.title'),
      subtitle: subtitle.trim() || null,
      status,
      blocks,
      updatedAt: initialPage?.updatedAt ?? null,
      updatedBy: initialPage?.updatedBy ?? null,
    }),
    [title, subtitle, status, blocks, initialPage, t]
  );

  const setBlock = (index: number, next: ContentBlock) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));

  const handleAddBlock = (type: AboutBlockType) => setBlocks((prev) => [...prev, defaultBlock(type)]);
  const handleRemove = (index: number) => setBlocks((prev) => prev.filter((_, i) => i !== index));
  const handleMove = (index: number, dir: -1 | 1) => setBlocks((prev) => moveItem(prev, index, index + dir));
  const handleToggleHidden = (index: number) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, hidden: !b.hidden } : b)));

  const handlePickImageFor = async (index: number, apply: (url: string) => void) => {
    try {
      setUploadingIndex(index);
      const asset = await pickImage();
      if (!asset) return;
      const url = await onUploadImage(asset);
      apply(url);
    } catch (uploadError) {
      showAlert(t('common.error'), uploadError instanceof Error ? uploadError.message : t('common.tryAgain'));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert(t('common.error'), t('admin.aboutUs.validationTitleRequired'));
      return;
    }
    for (const block of blocks) {
      for (const url of collectBlockUrls(block)) {
        if (url && !isValidUrl(url)) {
          showAlert(t('common.error'), t('admin.aboutUs.validationInvalidUrl'));
          return;
        }
      }
    }
    onSubmit({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      status,
      blocks,
    });
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.toggleRow}>
            <Pressable onPress={() => setPreview(false)}>
              <ThemedView type={preview ? 'surface' : 'primarySoft'} style={styles.statusChip}>
                <ThemedText type="small" themeColor={preview ? 'textSecondary' : 'primary'}>
                  {t('admin.aboutUs.tabEdit')}
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={() => setPreview(true)}>
              <ThemedView type={preview ? 'primarySoft' : 'surface'} style={styles.statusChip}>
                <ThemedText type="small" themeColor={preview ? 'primary' : 'textSecondary'}>
                  {t('admin.aboutUs.tabPreview')}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>

          {preview ? (
            <AboutPageView page={previewPage} preview />
          ) : (
            <>
              <ThemedText type="small">{t('admin.aboutUs.pageTitle')}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('aboutUs.title')}
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />

              <ThemedText type="small">{t('admin.aboutUs.pageSubtitle')}</ThemedText>
              <TextInput
                value={subtitle}
                onChangeText={setSubtitle}
                placeholder={t('aboutUs.subtitlePlaceholder')}
                placeholderTextColor={theme.textMuted}
                style={inputStyle}
              />

              <ThemedText type="small">{t('admin.aboutUs.status')}</ThemedText>
              <View style={styles.statusRow}>
                {STATUSES.map((value) => {
                  const selected = value === status;
                  return (
                    <Pressable key={value} onPress={() => setStatus(value)}>
                      <ThemedView type={selected ? 'primarySoft' : 'surface'} style={styles.statusChip}>
                        <ThemedText type="small" themeColor={selected ? 'primary' : 'textSecondary'}>
                          {t(`admin.aboutUs.status_${value}`)}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="small" style={styles.sectionLabel}>
                {t('admin.aboutUs.sections')}
              </ThemedText>

              {blocks.map((block, i) => (
                <BlockCard
                  key={i}
                  block={block}
                  index={i}
                  total={blocks.length}
                  uploading={uploadingIndex === i}
                  onChange={(next) => setBlock(i, next)}
                  onRemove={() => handleRemove(i)}
                  onMoveUp={() => handleMove(i, -1)}
                  onMoveDown={() => handleMove(i, 1)}
                  onToggleHidden={() => handleToggleHidden(i)}
                  onPickImage={(apply) => handlePickImageFor(i, apply)}
                />
              ))}

              <View style={styles.blockButtons}>
                {ABOUT_BLOCK_TYPES.map((type) => (
                  <Pressable key={type} onPress={() => handleAddBlock(type)}>
                    <ThemedView type="surface" style={[styles.addBlockButton, { borderColor: theme.primary }]}>
                      <ThemedText type="small" themeColor="primary">
                        + {t(`admin.aboutUs.block_${type}`)}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={styles.submit}>
            <PrimaryButton
              title={status === 'published' ? t('admin.aboutUs.saveAndPublish') : t('admin.aboutUs.saveDraft')}
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

interface BlockCardProps {
  block: ContentBlock;
  index: number;
  total: number;
  uploading: boolean;
  onChange: (next: ContentBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHidden: () => void;
  onPickImage: (apply: (url: string) => void) => void;
}

function BlockCard({
  block,
  index,
  total,
  uploading,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
  onPickImage,
}: BlockCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const inputStyle = [
    styles.input,
    { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background },
  ];

  const headerLabel = ABOUT_BLOCK_TYPES.includes(block.type as AboutBlockType)
    ? t(`admin.aboutUs.block_${block.type as AboutBlockType}`)
    : block.type;

  return (
    <ThemedView type="surface" style={[styles.blockRow, { borderColor: theme.border }, block.hidden && styles.blockHidden]}>
      <View style={styles.blockRowHeader}>
        <ThemedText type="smallBold" themeColor="primary">
          {headerLabel}
        </ThemedText>
        <View style={styles.blockActions}>
          <Pressable onPress={onMoveUp} disabled={index === 0} hitSlop={8}>
            <ArrowUp size={16} color={index === 0 ? theme.textDisabled : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={index === total - 1} hitSlop={8}>
            <ArrowDown size={16} color={index === total - 1 ? theme.textDisabled : theme.textSecondary} />
          </Pressable>
          <Pressable onPress={onToggleHidden} hitSlop={8} accessibilityLabel={t('admin.aboutUs.toggleVisible')}>
            {block.hidden ? <EyeOff size={16} color={theme.textSecondary} /> : <Eye size={16} color={theme.primary} />}
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8}>
            <Trash2 size={16} color={theme.destructive} />
          </Pressable>
        </View>
      </View>

      {block.type === 'hero' && (
        <>
          <ImageField
            label={t('admin.aboutUs.image')}
            value={block.data.imageUrl}
            uploading={uploading}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, imageUrl: v } })}
            onPick={() => onPickImage((url) => onChange({ ...block, data: { ...block.data, imageUrl: url } }))}
          />
          <ThemedText type="small">{t('admin.aboutUs.heroHeadline')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.headline ?? ''}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, headline: v } })}
            placeholderTextColor={theme.textMuted}
          />
          <ThemedText type="small">{t('admin.aboutUs.heroSubheadline')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.subheadline ?? ''}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, subheadline: v } })}
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {block.type === 'text' && (
        <>
          <ThemedText type="small">{t('admin.aboutUs.textContent')}</ThemedText>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={block.data.html}
            onChangeText={(v) => onChange({ ...block, data: { html: v } })}
            multiline
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {block.type === 'image' && (
        <>
          <ImageField
            label={t('admin.aboutUs.image')}
            value={block.data.url}
            uploading={uploading}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, url: v } })}
            onPick={() => onPickImage((url) => onChange({ ...block, data: { ...block.data, url } }))}
          />
          <ThemedText type="small">{t('admin.aboutUs.caption')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.caption ?? ''}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, caption: v } })}
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {block.type === 'gallery' && (
        <GalleryEditor
          urls={block.data.urls ?? []}
          uploading={uploading}
          onChange={(urls) => onChange({ ...block, data: { ...block.data, urls } })}
          onPick={() =>
            onPickImage((url) => onChange({ ...block, data: { ...block.data, urls: [...(block.data.urls ?? []), url] } }))
          }
        />
      )}

      {block.type === 'quote' && (
        <>
          <ThemedText type="small">{t('admin.aboutUs.quoteText')}</ThemedText>
          <TextInput
            style={[inputStyle, styles.textAreaSmall]}
            value={block.data.text}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, text: v } })}
            multiline
            placeholderTextColor={theme.textMuted}
          />
          <ThemedText type="small">{t('admin.aboutUs.quoteAuthor')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.author ?? ''}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, author: v } })}
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {block.type === 'link' && (
        <>
          <ThemedText type="small">{t('admin.aboutUs.linkUrl')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.url}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, url: v } })}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://"
            placeholderTextColor={theme.textMuted}
          />
          <ThemedText type="small">{t('admin.aboutUs.linkTitle')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.title ?? ''}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, title: v } })}
            placeholderTextColor={theme.textMuted}
          />
          <ThemedText type="small">{t('admin.aboutUs.linkDescription')}</ThemedText>
          <TextInput
            style={inputStyle}
            value={block.data.description ?? ''}
            onChangeText={(v) => onChange({ ...block, data: { ...block.data, description: v } })}
            multiline
            placeholderTextColor={theme.textMuted}
          />
        </>
      )}

      {block.type === 'social-links' && (
        <SocialLinksEditor
          title={block.data.title ?? ''}
          links={block.data.links ?? []}
          onChangeTitle={(v) => onChange({ ...block, data: { ...block.data, title: v } })}
          onChangeLinks={(links) => onChange({ ...block, data: { ...block.data, links } })}
        />
      )}
    </ThemedView>
  );
}

function ImageField({
  label,
  value,
  uploading,
  onChangeText,
  onPick,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onChangeText: (v: string) => void;
  onPick: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <ThemedText type="small">{label}</ThemedText>
      <TextInput
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://"
        placeholderTextColor={theme.textMuted}
      />
      <Pressable onPress={onPick} disabled={uploading}>
        <ThemedView type="surface" style={[styles.uploadButton, { borderColor: theme.primary }]}>
          <ImageIcon size={16} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            {uploading ? t('admin.aboutUs.uploading') : t('admin.aboutUs.uploadImage')}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </>
  );
}

function GalleryEditor({
  urls,
  uploading,
  onChange,
  onPick,
}: {
  urls: string[];
  uploading: boolean;
  onChange: (urls: string[]) => void;
  onPick: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <ThemedText type="small">
        {t('admin.aboutUs.galleryImages')} ({t('admin.aboutUs.oneUrlPerLine')})
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background },
        ]}
        value={urls.join('\n')}
        onChangeText={(v) => onChange(v.split('\n').map((u) => u.trim()).filter(Boolean))}
        multiline
        autoCapitalize="none"
        placeholder="https://example.com/image1.jpg"
        placeholderTextColor={theme.textMuted}
      />
      <Pressable onPress={onPick} disabled={uploading}>
        <ThemedView type="surface" style={[styles.uploadButton, { borderColor: theme.primary }]}>
          <ImageIcon size={16} color={theme.primary} />
          <ThemedText type="small" themeColor="primary">
            {uploading ? t('admin.aboutUs.uploading') : t('admin.aboutUs.addImage')}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </>
  );
}

function SocialLinksEditor({
  title,
  links,
  onChangeTitle,
  onChangeLinks,
}: {
  title: string;
  links: SocialLinkItem[];
  onChangeTitle: (v: string) => void;
  onChangeLinks: (links: SocialLinkItem[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const inputStyle = [
    styles.input,
    { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background },
  ];

  const update = (i: number, patch: Partial<SocialLinkItem>) =>
    onChangeLinks(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <>
      <ThemedText type="small">{t('admin.aboutUs.socialHeading')}</ThemedText>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={onChangeTitle}
        placeholder={t('aboutUs.followUs')}
        placeholderTextColor={theme.textMuted}
      />
      {links.map((link, i) => (
        <ThemedView key={i} type="background" style={[styles.socialRow, { borderColor: theme.border }]}>
          <View style={styles.blockRowHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.aboutUs.socialLink')} {i + 1}
            </ThemedText>
            <Pressable onPress={() => onChangeLinks(links.filter((_, idx) => idx !== i))} hitSlop={8}>
              <Trash2 size={14} color={theme.destructive} />
            </Pressable>
          </View>
          <View style={styles.platformRow}>
            {SOCIAL_PLATFORMS.map((p) => (
              <Pressable key={p} onPress={() => update(i, { platform: p })}>
                <ThemedView type={link.platform === p ? 'primarySoft' : 'surface'} style={styles.platformChip}>
                  <ThemedText type="small" themeColor={link.platform === p ? 'primary' : 'textSecondary'}>
                    {p}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={inputStyle}
            value={link.username}
            onChangeText={(v) => update(i, { username: v })}
            placeholder={t('admin.aboutUs.socialUsername')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={inputStyle}
            value={link.url}
            onChangeText={(v) => update(i, { url: v })}
            placeholder="https://"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
        </ThemedView>
      ))}
      <Pressable
        onPress={() => onChangeLinks([...links, { platform: 'INSTAGRAM', username: '', url: '' }])}>
        <ThemedView type="surface" style={[styles.addBlockButton, { borderColor: theme.primary }]}>
          <ThemedText type="small" themeColor="primary">
            + {t('admin.aboutUs.addSocialLink')}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </>
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
  textArea: { height: 100, textAlignVertical: 'top' },
  textAreaSmall: { height: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  statusRow: { flexDirection: 'row', gap: Spacing.two },
  statusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.pill,
  },
  sectionLabel: { marginTop: Spacing.three },
  blockRow: {
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  blockHidden: { opacity: 0.55 },
  blockRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  blockActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  blockButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  addBlockButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.control,
    borderWidth: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: RADII.control,
    borderWidth: 1,
  },
  socialRow: {
    borderWidth: 1,
    borderRadius: RADII.control,
    padding: Spacing.two,
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  platformChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  submit: { marginTop: Spacing.three },
});
