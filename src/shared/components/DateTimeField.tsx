import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

/**
 * Date + time, edited with the OS picker. `value` / `onChange` speak ISO 8601
 * UTC ("2022-07-04T22:39:39.000Z"). iOS shows an inline datetime picker;
 * Android has no combined mode, so a tap opens the date picker then the time
 * picker; web falls back to <input type="datetime-local">.
 *
 * Extracted from features/podcast/PostForm's local copy — same behaviour.
 */
export function DateTimeField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const theme = useTheme();
  const [androidStep, setAndroidStep] = useState<null | 'date' | 'time'>(null);

  const date = useMemo(() => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  if (Platform.OS === 'web') {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return (
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => {
          const next = new Date(e.target.value);
          if (!Number.isNaN(next.getTime())) onChange(next.toISOString());
        }}
        style={{
          padding: 12,
          borderRadius: RADII.control,
          border: `1px solid ${theme.border}`,
          background: theme.background,
          color: theme.textPrimary,
          fontSize: 15,
          colorScheme: 'light dark',
        }}
      />
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="datetime"
        onChange={(_e: DateTimePickerEvent, next?: Date) => {
          if (next) onChange(next.toISOString());
        }}
      />
    );
  }

  const handleAndroidChange = (event: DateTimePickerEvent, next?: Date) => {
    if (event.type !== 'set' || !next) {
      setAndroidStep(null);
      return;
    }
    const merged = new Date(date);
    if (androidStep === 'date') {
      merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
      onChange(merged.toISOString());
      setAndroidStep('time');
    } else {
      merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
      onChange(merged.toISOString());
      setAndroidStep(null);
    }
  };

  return (
    <>
      <Pressable onPress={() => setAndroidStep('date')}>
        <ThemedView type="surface" style={[styles.input, { borderColor: theme.border }]}>
          <ThemedText type="small">{date.toLocaleString()}</ThemedText>
        </ThemedView>
      </Pressable>
      {androidStep ? <DateTimePicker value={date} mode={androidStep} onChange={handleAndroidChange} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
});
