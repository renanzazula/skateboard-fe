import { Shield } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text } from 'react-native';

import type { PrivacyPolicy } from '@/features/privacy-policy/types';
import { EmptyState } from '@/shared/components/EmptyState';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type Props = {
  /** null → nothing published/configured yet, renders the empty state. */
  page: PrivacyPolicy | null;
  /** Preview mode (the admin editor) hides the empty-state CTA framing. */
  preview?: boolean;
};

/**
 * Renders a published Privacy Policy page: title, then its body text as
 * paragraphs (split on blank lines). Shared by the public read-only screen
 * (app/privacy-policy.tsx) and the admin editor's live preview
 * (PrivacyPolicyForm).
 */
export function PrivacyPolicyView({ page, preview }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();

  if (!page) {
    return (
      <EmptyState
        icon={Shield}
        title={t('privacyPolicy.emptyTitle')}
        description={preview ? t('privacyPolicy.emptyPreview') : t('privacyPolicy.emptyDescription')}
      />
    );
  }

  const paragraphs = page.body.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{page.title}</Text>
      {paragraphs.map((paragraph, i) => (
        <Text key={i} style={[styles.paragraph, { color: colors.textSecondary }]}>
          {paragraph}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.four,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.three,
  },
});
