import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type Props = {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  maxItems: number;
  placeholder?: string;
  addLabel: string;
  /** Returns an error message for an invalid entry, or null when it's fine to add. */
  validate?: (value: string) => string | null;
  disabled?: boolean;
};

/**
 * A bounded add/remove list of free-text entries — social links on the
 * Guest Application form, recipient Keycloak ids on its admin settings
 * screen. Generic rather than duplicated per call site: both are "type a
 * value, validate it, add it to a capped list" with nothing else in common.
 */
export function StringListEditor({ label, values, onChange, maxItems, placeholder, addLabel, validate, disabled }: Readonly<Props>) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const atLimit = values.length >= maxItems;

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const validationError = validate?.(trimmed) ?? null;
    if (validationError) {
      setDraftError(validationError);
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
    setDraftError(null);
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}

      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <ThemedText type="default" style={styles.rowText} numberOfLines={1}>
            {value}
          </ThemedText>
          {disabled ? null : (
            <Pressable onPress={() => handleRemove(index)} accessibilityLabel="Remove" hitSlop={8}>
              <X size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      ))}

      {!disabled && !atLimit ? (
        <View style={styles.addRow}>
          <View style={styles.addInput}>
            <TextField
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                setDraftError(null);
              }}
              placeholder={placeholder}
              error={draftError ?? undefined}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleAdd}
            />
          </View>
          <Pressable
            onPress={handleAdd}
            style={[styles.addButton, { backgroundColor: theme.surfaceElevated }]}
            accessibilityLabel={addLabel}>
            <Plus size={18} color={theme.textPrimary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: RADII.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  rowText: { flex: 1 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  addInput: { flex: 1 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: RADII.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
