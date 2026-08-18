import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/features/settings/components/SectionLabel';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  label?: string;
  tone?: 'default' | 'danger';
  children: ReactNode[];
};

/** Section label + its rows, flat on the screen background with hairline dividers between them (none after the last). No card. */
export function SettingsSection({ label, tone = 'default', children }: Props) {
  const theme = useTheme();
  const rows = Array.isArray(children) ? children : [children];
  const danger = tone === 'danger';

  return (
    <View style={styles.section}>
      {label ? <SectionLabel label={label} danger={danger} /> : null}
      <View>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {row}
            {index < rows.length - 1 ? <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} /> : null}
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 24 + 16,
  },
});
