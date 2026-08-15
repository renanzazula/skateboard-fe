import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  label?: string;
  tone?: 'default' | 'danger';
  children: ReactNode[];
};

/** Section label + one card wrapping its rows, hairline dividers between them (none after the last). */
export function SettingsSection({ label, tone = 'default', children }: Props) {
  const theme = useTheme();
  const rows = Array.isArray(children) ? children : [children];
  const danger = tone === 'danger';

  return (
    <View style={styles.section}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
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
            {index < rows.length - 1 ? <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} /> : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.06 * 11,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14 + 32 + 12,
  },
});
