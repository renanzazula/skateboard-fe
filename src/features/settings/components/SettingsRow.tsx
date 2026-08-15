import * as Haptics from 'expo-haptics';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Skeleton } from '@/features/settings/components/Skeleton';
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
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  trailing?: SettingsRowTrailing;
  onPress?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

/**
 * The one row primitive the redesign centers on — icon chip, title/subtitle,
 * one of four trailing variants. See .docs/SETTINGS_REDESIGN.md §4.
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
      <View style={[styles.chip, { backgroundColor: destructive ? theme.destructiveBg : theme.chipBg }]}>
        <Icon color={destructive ? theme.destructive : theme.textSecondary} size={18} strokeWidth={2} />
      </View>

      <View style={styles.textStack}>
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
      <Switch
        value={trailing.value}
        onValueChange={onSwitchChange}
        disabled={trailing.disabled}
        trackColor={{ false: theme.toggleTrackOff, true: theme.primary }}
        thumbColor={trailing.value ? theme.toggleThumbOn : theme.toggleThumbOff}
      />
    );
  }

  if (trailing.type === 'value') {
    return (
      <View style={styles.valueGroup}>
        {trailing.loading ? (
          <Skeleton width={48} />
        ) : (
          <Text
            style={[styles.value, { color: trailing.tone === 'accent' ? theme.primary : theme.textSecondary }]}
            numberOfLines={1}>
            {trailing.text}
          </Text>
        )}
        {trailing.chevron ? <ChevronRight color={theme.textMuted} size={18} /> : null}
      </View>
    );
  }

  if (trailing.type === 'chevron') {
    return <ChevronRight color={theme.textMuted} size={18} />;
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textStack: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
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
