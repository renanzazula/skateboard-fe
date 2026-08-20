import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/features/settings/components/SectionLabel';
import { RADII } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  label?: string;
  tone?: 'default' | 'danger';
  /** One row or many — a section of a single row is a normal case. */
  children: ReactNode | ReactNode[];
};

/**
 * Section label + its rows grouped into a card, with hairline dividers
 * between rows (none after the last).
 *
 * The card is the app's standard surface recipe — 1px border, RADII.card,
 * surface fill — the same one EpisodeCard, MiniPodcastPlayer and ErrorBanner
 * use. Settings used to render rows flat on the screen background, which left
 * it as the only area speaking a different language, directly beneath
 * ProfileCard, which was already a card.
 *
 * Rows carry their own horizontal padding, so the card holds none.
 */
export function SettingsSection({ label, tone = 'default', children }: Props) {
  const theme = useTheme();
  // Falsy children are dropped before the dividers are worked out: screens
  // gate rows on permissions with `{cond ? <SettingsRow/> : null}`, and a null
  // left in place would still earn a divider, leaving one floating in the card.
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  const danger = tone === 'danger';

  return (
    <View style={styles.section}>
      {label ? <SectionLabel label={label} danger={danger} /> : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: danger ? theme.destructiveBg : theme.surface,
            borderColor: danger ? theme.destructiveBorder : theme.border,
          },
        ]}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {row}
            {index < rows.length - 1 ? (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: danger ? theme.destructiveBorder : theme.borderDivider },
                ]}
              />
            ) : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: RADII.card,
    overflow: 'hidden',
  },
  // Lines the divider up with the row's text: the row's own horizontal
  // padding (16) + the icon column (24) + the gap after it (16).
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16 + 24 + 16,
  },
});
