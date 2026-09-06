import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/shared/components/DateTimeField';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { ChoiceChips } from '@/features/campaign/admin/components/ChoiceChips';
import type {
  Campaign,
  CampaignAudience,
  CampaignFrequencyType,
  CampaignRequest,
} from '@/features/campaign/types';

type Props = {
  initial?: Campaign;
  submitting: boolean;
  onSubmit: (body: CampaignRequest) => void;
};

const AUDIENCES: CampaignAudience[] = ['ALL', 'AUTHENTICATED', 'ANONYMOUS'];
const FREQUENCIES: CampaignFrequencyType[] = [
  'ALWAYS',
  'ONCE',
  'ONCE_PER_SESSION',
  'ONCE_PER_DAY',
  'MAX_PER_DAY',
];

export function CampaignForm({ initial, submitting, onSubmit }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState(initial?.name ?? '');
  const [note, setNote] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState(String(initial?.priority ?? 0));
  const [startAt, setStartAt] = useState(() => initial?.startAt ?? new Date().toISOString());
  const [endAt, setEndAt] = useState(
    () => initial?.endAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString()
  );
  const [audience, setAudience] = useState<CampaignAudience>(initial?.audience ?? 'ALL');
  const [frequencyType, setFrequencyType] = useState<CampaignFrequencyType>(
    initial?.frequencyType ?? 'ALWAYS'
  );
  const [maxPerDay, setMaxPerDay] = useState(String(initial?.maxDisplaysPerDay ?? 3));

  const scheduleError = useMemo(
    () => (new Date(endAt) <= new Date(startAt) ? t('admin.campaigns.validationSchedule') : null),
    [startAt, endAt, t]
  );

  const canSubmit = name.trim().length > 0 && !scheduleError && !submitting;

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      description: note.trim() || undefined,
      startAt,
      endAt,
      priority: Number.parseInt(priority, 10) || 0,
      audience,
      frequencyType,
      maxDisplaysPerDay:
        frequencyType === 'MAX_PER_DAY' ? Number.parseInt(maxPerDay, 10) || 1 : undefined,
    });
  };

  return (
    <View style={styles.form}>
      <TextField label={t('admin.campaigns.name')} value={name} onChangeText={setName} />
      <TextField
        label={t('admin.campaigns.internalNote')}
        value={note}
        onChangeText={setNote}
        multiline
      />
      <TextField
        label={t('admin.campaigns.priority')}
        value={priority}
        onChangeText={setPriority}
        keyboardType="number-pad"
      />
      <ThemedText type="small" themeColor="textMuted">
        {t('admin.campaigns.priorityHint')}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.campaigns.startAt')}
        </ThemedText>
        <DateTimeField value={startAt} onChange={setStartAt} />
      </View>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.campaigns.endAt')}
        </ThemedText>
        <DateTimeField value={endAt} onChange={setEndAt} />
        {scheduleError ? (
          <ThemedText type="small" themeColor="destructive">
            {scheduleError}
          </ThemedText>
        ) : null}
      </View>

      <ChoiceChips
        label={t('admin.campaigns.audience')}
        value={audience}
        onChange={setAudience}
        options={AUDIENCES.map((a) => ({
          value: a,
          label: t(`admin.campaigns.audience_${a}` as 'admin.campaigns.audience_ALL'),
        }))}
      />
      <ChoiceChips
        label={t('admin.campaigns.frequency')}
        value={frequencyType}
        onChange={setFrequencyType}
        options={FREQUENCIES.map((f) => ({
          value: f,
          label: t(`admin.campaigns.frequency_${f}` as 'admin.campaigns.frequency_ALWAYS'),
        }))}
      />
      {frequencyType === 'MAX_PER_DAY' ? (
        <TextField
          label={t('admin.campaigns.maxDisplaysPerDay')}
          value={maxPerDay}
          onChangeText={setMaxPerDay}
          keyboardType="number-pad"
        />
      ) : null}

      <PrimaryButton title={t('common.save')} onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, paddingBottom: Spacing.five },
  field: { gap: Spacing.one, width: '100%' },
});
