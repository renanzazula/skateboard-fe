import { Info } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SocialLinksView } from '@/features/about/components/SocialLinksView';
import type { AboutPage, ContentBlock } from '@/features/about/types';
import { BlockRenderer } from '@/shared/components/content/BlockRenderer';
import { EmptyState } from '@/shared/components/EmptyState';
import { MAX_CONTENT_WIDTH, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';

type Props = {
  /** null → nothing published/configured yet, renders the empty state. */
  page: AboutPage | null;
  /** Preview mode (the admin editor) hides the empty-state CTA framing. */
  preview?: boolean;
};

function renderBlock(block: ContentBlock, index: number) {
  if (block.hidden) return null;
  if (block.type === 'social-links') {
    return <SocialLinksView key={index} data={block.data} />;
  }
  return <BlockRenderer key={index} block={block} />;
}

/**
 * Renders a published About Us page: title, optional subtitle, then its content
 * blocks in order. Shared by the read-only viewer screen
 * (app/(tabs)/settings/about-us.tsx) and the admin editor's live preview
 * (AboutForm).
 */
export function AboutPageView({ page, preview }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();

  if (!page) {
    return (
      <EmptyState
        icon={Info}
        title={t('aboutUs.emptyTitle')}
        description={preview ? t('aboutUs.emptyPreview') : t('aboutUs.emptyDescription')}
      />
    );
  }

  const visibleBlocks = page.blocks.filter((b) => !b.hidden);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{page.title}</Text>
      {page.subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{page.subtitle}</Text>
      ) : null}

      {visibleBlocks.length === 0 ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('aboutUs.noSections')}</Text>
      ) : (
        <View style={styles.blocks}>{page.blocks.map((block, i) => renderBlock(block, i))}</View>
      )}
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
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.four,
  },
  blocks: {
    marginTop: Spacing.two,
  },
});
