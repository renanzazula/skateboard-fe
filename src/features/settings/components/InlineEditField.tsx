import { Pencil } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/shared/hooks/use-theme';
import { showAlert } from '@/shared/utils/alert';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (next: string) => Promise<void>;
};

/** Resting: label + value + gold pencil. Tapping swaps the value for a gold-bordered TextInput with Save/Cancel. See .docs/SETTINGS_REDESIGN_2.md §6/§7. */
export function InlineEditField({ label, value, placeholder, onSave }: Props) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (saveError) {
      showAlert('Could not save', saveError instanceof Error ? saveError.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Pressable
        onPress={() => setEditing(true)}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}>
        <View style={styles.textStack}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]} numberOfLines={1}>
            {value || placeholder}
          </Text>
        </View>
        <Pencil size={16} color={theme.primary} />
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        editable={!saving}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.primary, color: theme.textPrimary }]}
      />
      <View style={styles.actions}>
        <Pressable onPress={cancel} disabled={saving} hitSlop={8}>
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={saving} hitSlop={8}>
          <Text style={[styles.actionText, { color: theme.primary }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  textStack: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
