import * as Haptics from 'expo-haptics';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Skeleton } from '@/features/settings/components/Skeleton';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export type SettingsRowTrailing =
  | { type: 'chevron' }
  // Some value rows are also navigable (Language, Clear cache, Storage usage
  // in the spec's screen structure) — `chevron` pairs the two rather than
  // forcing a strict either/or, matching the spec's own screen mock over its
  // stricter type sketch. `tone: 'accent'` is the gold "live link" value
  // style the spec calls out for Language.
  | { type: 'value'; text: string; loading?: boolean; chevron?: boolean; tone?: 'default' | 'accent' }
  | { type: 'switch'; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }
  | { type: 'none' };

type Props = {
  /**
   * Optional: a row that is purely a labelled value (Settings → Your account)
   * carries no icon, and reserving the column for it would leave every label
   * indented past nothing.
   */
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

/**
 * The one row primitive the redesign centers on — icon + title/description +
 * one of four trailing variants, flat on the screen background (no icon chip
 * or card). See .docs/SETTINGS_REDESIGN_2.md §4/§6.
 */
export function SettingsRow({ icon: Icon, title, subtitle, trailing = { type: 'none' }, onPress, variant = 'default', disabled }: Props) {
  const theme = useTheme();
  const destructive = variant === 'destructive';
  const isSwitchRow = trailing.type === 'switch';
  const isPressable = (Boolean(onPress) || isSwitchRow) && !disabled;

  const handleSwitchChange = (next: boolean) => {
    if (trailing.type !== 'switch') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    trailing.onChange(next);
  };

  const handleRowPress = () => {
    if (isSwitchRow && trailing.type === 'switch' && !trailing.disabled) {
      handleSwitchChange(!trailing.value);
      return;
    }
    onPress?.();
  };

  return (
    <Pressable
      disabled={!isPressable}
      onPress={handleRowPress}
      accessibilityRole={isSwitchRow ? 'switch' : isPressable ? 'button' : undefined}
      accessibilityState={trailing.type === 'switch' ? { checked: trailing.value, disabled } : { disabled }}
      style={({ pressed }) => [
        styles.row,
        pressed && isPressable && { backgroundColor: theme.surfacePressed },
        disabled && styles.disabled,
      ]}>
      {Icon ? (
        <View style={styles.iconColumn}>
          <Icon color={destructive ? theme.destructive : theme.textSecondary} size={20} strokeWidth={2} />
        </View>
      ) : null}

      <View style={[styles.textStack, Icon ? null : styles.textStackFlush]}>
        <Text style={[styles.title, { color: destructive ? theme.destructive : theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Trailing trailing={trailing} onSwitchChange={handleSwitchChange} />
    </Pressable>
  );
}

function Trailing({ trailing, onSwitchChange }: { trailing: SettingsRowTrailing; onSwitchChange: (value: boolean) => void }) {
  const theme = useTheme();

  if (trailing.type === 'switch') {
    return (
      <View style={styles.trailing}>
        <Switch
          value={trailing.value}
          onValueChange={onSwitchChange}
          disabled={trailing.disabled}
          trackColor={{ false: theme.toggleTrackOff, true: theme.primary }}
          thumbColor={trailing.value ? theme.toggleThumbOn : theme.toggleThumbOff}
        />
      </View>
    );
  }

  if (trailing.type === 'value') {
    return (
      <View style={[styles.trailing, styles.valueGroup]}>
        {trailing.loading ? (
          <Skeleton width={48} />
        ) : (
          <Text
            style={[styles.value, { color: trailing.tone === 'accent' ? theme.primary : theme.textSecondary }]}
            numberOfLines={1}>
            {trailing.text}
          </Text>
        )}
        {trailing.chevron ? <ChevronRight color={theme.textMuted} size={16} /> : null}
      </View>
    );
  }

  if (trailing.type === 'chevron') {
    return (
      <View style={styles.trailing}>
        <ChevronRight color={theme.textMuted} size={16} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 15,
    // Inset from the section card's edge (SettingsSection holds no padding of
    // its own, so the row owns it and the pressed highlight spans the card).
    paddingHorizontal: Spacing.three,
  },
  disabled: {
    opacity: 0.5,
  },
  iconColumn: {
    width: 24,
    alignItems: 'center',
  },
  // Without an icon there is no column to clear, so the label starts at the
  // row's own padding.
  textStackFlush: {
    marginLeft: 0,
  },
  textStack: {
    flex: 1,
    gap: 2,
    marginLeft: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  trailing: {
    marginLeft: 8,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
});
