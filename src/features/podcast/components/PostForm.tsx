import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { MAX_FORM_WIDTH, RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export interface PostFormValues {
  title: string;
  coverUrl: string;
  status: 'draft' | 'scheduled' | 'published';
}

interface PostFormProps {
  initialValues?: Partial<PostFormValues>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: PostFormValues) => void;
}

// Content blocks and social links exist in the BFF contract but have no
// editor here yet — this form covers the fields needed for a working
// create/edit flow (title, cover, status); posts are created with an empty
// blocks array. Extend when a real block editor is needed.
const STATUSES: PostFormValues['status'][] = ['draft', 'scheduled', 'published'];

export function PostForm({ initialValues, submitLabel, submitting, onSubmit }: PostFormProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? '');
  const [status, setStatus] = useState<PostFormValues['status']>(initialValues?.status ?? 'published');

  const canSubmit = title.trim().length > 0 && coverUrl.trim().length > 0 && !submitting;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small">Title</ThemedText>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Post title"
        placeholderTextColor={theme.textFaint}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />

      <ThemedText type="small">Cover image URL</ThemedText>
      <TextInput
        value={coverUrl}
        onChangeText={setCoverUrl}
        placeholder="https://…"
        placeholderTextColor={theme.textFaint}
        autoCapitalize="none"
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />

      <ThemedText type="small">Status</ThemedText>
      <ThemedView style={styles.statusRow}>
        {STATUSES.map((value) => {
          const selected = value === status;
          return (
            <Pressable key={value} onPress={() => setStatus(value)}>
              <ThemedView type={selected ? 'accentSoft' : 'surface'} style={styles.statusChip}>
                <ThemedText type="small" themeColor={selected ? 'accent' : 'textDim'}>
                  {value}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>

      <Pressable
        disabled={!canSubmit}
        onPress={() => onSubmit({ title: title.trim(), coverUrl: coverUrl.trim(), status })}>
        <ThemedView type={canSubmit ? 'accent' : 'surface'} style={styles.submitButton}>
          <ThemedText type="smallBold" themeColor={canSubmit ? 'onAccent' : 'textFaint'}>
            {submitting ? 'Saving…' : submitLabel}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
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
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statusChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: RADII.pill,
  },
  submitButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: RADII.control,
    alignItems: 'center',
  },
});
