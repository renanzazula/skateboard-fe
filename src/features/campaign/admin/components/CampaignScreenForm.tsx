import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { ChoiceChips } from '@/features/campaign/admin/components/ChoiceChips';
import { isAllowedInternalTarget, isExternalUrl } from '@/features/campaign/ctaMatch';
import type {
  CampaignActionType,
  CampaignScreen,
  CampaignScreenRequest,
  CampaignTextAlignment,
  CampaignTextSize,
} from '@/features/campaign/types';

type Props = {
  initial?: CampaignScreen;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (body: CampaignScreenRequest) => void;
};

const ALIGNMENTS: CampaignTextAlignment[] = ['LEFT', 'CENTER', 'RIGHT'];
const SIZES: CampaignTextSize[] = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
const ACTIONS: CampaignActionType[] = ['NONE', 'INTERNAL', 'EXTERNAL'];

export function CampaignScreenForm({ initial, submitting, submitLabel, onSubmit }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [duration, setDuration] = useState(String(initial?.durationSeconds ?? 3));
  const [backgroundColor, setBackgroundColor] = useState(initial?.backgroundColor ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [textAlignment, setTextAlignment] = useState<CampaignTextAlignment>(
    initial?.textAlignment ?? 'CENTER'
  );
  const [titleSize, setTitleSize] = useState<CampaignTextSize>(initial?.titleSize ?? 'LARGE');
  const [descriptionSize, setDescriptionSize] = useState<CampaignTextSize>(
    initial?.descriptionSize ?? 'MEDIUM'
  );
  const [textColor, setTextColor] = useState(initial?.textColor ?? '');
  const [overlayOpacity, setOverlayOpacity] = useState(String(initial?.overlayOpacity ?? 0.35));
  const [closeEnabled, setCloseEnabled] = useState(initial?.closeEnabled ?? true);
  const [closeAfter, setCloseAfter] = useState(String(initial?.closeAfterSeconds ?? 1));
  const [actionType, setActionType] = useState<CampaignActionType>(initial?.actionType ?? 'NONE');
  const [actionLabel, setActionLabel] = useState(initial?.actionLabel ?? '');
  const [actionTarget, setActionTarget] = useState(initial?.actionTarget ?? '');

  const durationNum = Number.parseInt(duration, 10) || 0;
  const closeAfterNum = Number.parseInt(closeAfter, 10) || 0;

  const targetError = useMemo(() => {
    if (actionType === 'NONE') return null;
    if (!actionTarget.trim()) return t('admin.campaigns.validationActionTarget');
    if (actionType === 'INTERNAL' && !isAllowedInternalTarget(actionTarget.trim())) {
      return t('admin.campaigns.validationActionTarget');
    }
    if (actionType === 'EXTERNAL' && !isExternalUrl(actionTarget.trim())) {
      return t('admin.campaigns.validationActionTarget');
    }
    return null;
  }, [actionType, actionTarget, t]);

  const closeError =
    closeEnabled && !(closeAfterNum >= 0 && closeAfterNum < durationNum)
      ? `0 ≤ ${t('admin.campaigns.closeAfterSeconds')} < ${t('admin.campaigns.duration')}`
      : null;

  const canSubmit = durationNum > 0 && !targetError && !closeError && !submitting;

  const handleSubmit = () => {
    onSubmit({
      durationSeconds: durationNum,
      layoutType: 'FULL_BACKGROUND',
      backgroundColor: backgroundColor.trim() || undefined,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      textAlignment,
      titleSize,
      descriptionSize,
      textColor: textColor.trim() || undefined,
      overlayOpacity: Number.parseFloat(overlayOpacity) || 0,
      closeEnabled,
      closeAfterSeconds: closeEnabled ? closeAfterNum : undefined,
      actionType,
      actionLabel: actionType === 'NONE' ? undefined : actionLabel.trim() || undefined,
      actionTarget: actionType === 'NONE' ? undefined : actionTarget.trim() || undefined,
    });
  };

  return (
    <View style={styles.form}>
      <TextField
        label={t('admin.campaigns.duration')}
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
      />
      <TextField
        label={t('admin.campaigns.backgroundColor')}
        value={backgroundColor}
        onChangeText={setBackgroundColor}
        autoCapitalize="none"
        placeholder="#101010"
      />
      <TextField label={t('admin.campaigns.title_field')} value={title} onChangeText={setTitle} />
      <TextField
        label={t('admin.campaigns.description_field')}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <ChoiceChips
        label={t('admin.campaigns.textAlignment')}
        value={textAlignment}
        onChange={setTextAlignment}
        options={ALIGNMENTS.map((a) => ({ value: a, label: a }))}
      />
      <ChoiceChips
        label={t('admin.campaigns.titleSize')}
        value={titleSize}
        onChange={setTitleSize}
        options={SIZES.map((s) => ({ value: s, label: s }))}
      />
      <ChoiceChips
        label={t('admin.campaigns.descriptionSize')}
        value={descriptionSize}
        onChange={setDescriptionSize}
        options={SIZES.map((s) => ({ value: s, label: s }))}
      />
      <TextField
        label={t('admin.campaigns.textColor')}
        value={textColor}
        onChangeText={setTextColor}
        autoCapitalize="none"
        placeholder="#F5F5F2"
      />
      <TextField
        label={t('admin.campaigns.overlayOpacity')}
        value={overlayOpacity}
        onChangeText={setOverlayOpacity}
        keyboardType="decimal-pad"
      />

      <View style={styles.switchRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.campaigns.closeEnabled')}
        </ThemedText>
        <Switch
          value={closeEnabled}
          onValueChange={setCloseEnabled}
          trackColor={{ true: theme.primary, false: theme.toggleTrackOff }}
        />
      </View>
      {closeEnabled ? (
        <TextField
          label={t('admin.campaigns.closeAfterSeconds')}
          value={closeAfter}
          onChangeText={setCloseAfter}
          keyboardType="number-pad"
          error={closeError ?? undefined}
        />
      ) : null}

      <ChoiceChips
        label={t('admin.campaigns.actionType')}
        value={actionType}
        onChange={setActionType}
        options={ACTIONS.map((a) => ({
          value: a,
          label: t(`admin.campaigns.actionType_${a}` as 'admin.campaigns.actionType_NONE'),
        }))}
      />
      {actionType !== 'NONE' ? (
        <>
          <TextField
            label={t('admin.campaigns.actionLabel')}
            value={actionLabel}
            onChangeText={setActionLabel}
          />
          <TextField
            label={t('admin.campaigns.actionTarget')}
            value={actionTarget}
            onChangeText={setActionTarget}
            autoCapitalize="none"
            placeholder={actionType === 'EXTERNAL' ? 'https://…' : '/podcasts/123'}
            error={targetError ?? undefined}
          />
        </>
      ) : null}

      <PrimaryButton title={submitLabel} onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, paddingBottom: Spacing.five },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
