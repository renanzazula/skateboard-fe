import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/core/auth';
import { refreshAppConfig } from '@/core/config';
import type { BrandingAsset, BrandingConfig } from '@/features/branding/hooks/useBrandingAdmin';
import { useBrandingAdmin } from '@/features/branding/hooks/useBrandingAdmin';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { isBffError } from '@/shared/api/errors';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { TextField } from '@/shared/components/TextField';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { RADII, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { showAlert } from '@/shared/utils/alert';

const PREVIEW_HEIGHT = 140;

/** Requests photo library permission and lets the user pick one image. Returns null if denied/cancelled. */
async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to update branding images.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  return result.assets[0];
}

export default function BrandingScreen() {
  const { hasAuthority } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();
  const admin = useBrandingAdmin();
  const [config, setConfig] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAssetPromptVisible, setNewAssetPromptVisible] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [pendingAsset, setPendingAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loginTitleInput, setLoginTitleInput] = useState('');
  const [loginMessageInput, setLoginMessageInput] = useState('');

  const canManageBranding = hasAuthority('FUNC_TAB_SETTINGS_BRANDING');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await admin.getBrandingConfig();
      setConfig(data);
      setLoginTitleInput(data.loginTitle ?? '');
      setLoginMessageInput(data.loginMessage ?? '');
    } catch (loadError) {
      showAlert(t('admin.branding.loadError'), isBffError(loadError) ? loadError.message : t('common.tryAgain'));
    } finally {
      setLoading(false);
    }
    // admin.getBrandingConfig is stable across renders (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManageBranding) refresh();
  }, [canManageBranding, refresh]);

  if (!canManageBranding) {
    return <Redirect href="/settings" />;
  }

  const handleSaveLoginText = async () => {
    try {
      const updated = await admin.updateLoginText(loginTitleInput.trim(), loginMessageInput.trim());
      setConfig(updated);
      refreshAppConfig();
    } catch (saveError) {
      showAlert(t('admin.branding.saveLoginTextError'), isBffError(saveError) ? saveError.message : t('common.tryAgain'));
    }
  };

  const handleUploadLoginBackground = async () => {
    try {
      const asset = await pickImage();
      if (!asset) return;
      const updated = await admin.uploadLoginBackground(asset);
      setConfig(updated);
      refreshAppConfig();
    } catch (uploadError) {
      showAlert(t('admin.branding.uploadLoginBackgroundError'), isBffError(uploadError) ? uploadError.message : t('common.tryAgain'));
    }
  };

  const handleRemoveLoginBackground = async () => {
    try {
      const updated = await admin.removeLoginBackground();
      setConfig(updated);
      refreshAppConfig();
    } catch (removeError) {
      showAlert(t('admin.branding.removeLoginBackgroundError'), isBffError(removeError) ? removeError.message : t('common.tryAgain'));
    }
  };

  const handleUploadAppLogo = async () => {
    try {
      const asset = await pickImage();
      if (!asset) return;
      const updated = await admin.uploadAppLogo(asset);
      setConfig(updated);
      refreshAppConfig();
    } catch (uploadError) {
      showAlert(t('admin.branding.uploadAppLogoError'), isBffError(uploadError) ? uploadError.message : t('common.tryAgain'));
    }
  };

  const handleRemoveAppLogo = async () => {
    try {
      const updated = await admin.removeAppLogo();
      setConfig(updated);
      refreshAppConfig();
    } catch (removeError) {
      showAlert(t('admin.branding.removeAppLogoError'), isBffError(removeError) ? removeError.message : t('common.tryAgain'));
    }
  };

  const handleAddAssetPress = async () => {
    try {
      const asset = await pickImage();
      if (!asset) return;
      setPendingAsset(asset);
      setNewAssetName('');
      setNewAssetPromptVisible(true);
    } catch (pickError) {
      showAlert(t('admin.branding.pickImageError'), isBffError(pickError) ? pickError.message : t('common.tryAgain'));
    }
  };

  const handleConfirmNewAsset = async () => {
    const name = newAssetName.trim();
    if (!name || !pendingAsset) return;
    try {
      await admin.uploadBrandingAsset(name, pendingAsset);
      setNewAssetPromptVisible(false);
      setPendingAsset(null);
      await refresh();
    } catch (uploadError) {
      showAlert(t('admin.branding.addAssetError'), isBffError(uploadError) ? uploadError.message : t('common.tryAgain'));
    }
  };

  const handleReplaceAsset = async (asset: BrandingAsset) => {
    if (!asset.id) return;
    try {
      const picked = await pickImage();
      if (!picked) return;
      await admin.replaceBrandingAsset(asset.id, picked);
      await refresh();
    } catch (replaceError) {
      showAlert(t('admin.branding.replaceAssetError'), isBffError(replaceError) ? replaceError.message : t('common.tryAgain'));
    }
  };

  const handleRemoveAsset = (asset: BrandingAsset) => {
    if (!asset.id) return;
    const assetId = asset.id;
    showAlert(t('admin.branding.removeAssetTitle'), t('admin.branding.removeAssetMessage', { name: asset.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await admin.removeBrandingAsset(assetId);
            await refresh();
          } catch (removeError) {
            showAlert(t('admin.branding.removeAssetError'), isBffError(removeError) ? removeError.message : t('common.tryAgain'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <SettingsHeader title={t('admin.branding.title')} />
        <ThemedView style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SettingsHeader title={t('admin.branding.title')} />
      <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title={t('admin.branding.loginTextSection')}>
            <TextField
              value={loginTitleInput}
              onChangeText={setLoginTitleInput}
              placeholder={t('admin.branding.loginTitlePlaceholder')}
            />
            <TextField
              value={loginMessageInput}
              onChangeText={setLoginMessageInput}
              placeholder={t('admin.branding.loginMessagePlaceholder')}
            />
            <PrimaryButton
              title={t('common.save')}
              onPress={handleSaveLoginText}
              loading={admin.submitting}
              disabled={admin.submitting}
            />
          </Section>

          <Section title={t('admin.branding.loginBackgroundSection')}>
            <Preview uri={config?.loginBackgroundUrl} />
            <View style={styles.actionRow}>
              <View style={styles.actionButton}>
                <PrimaryButton
                  title={config?.loginBackgroundUrl ? t('admin.branding.replace') : t('admin.branding.upload')}
                  onPress={handleUploadLoginBackground}
                  loading={admin.submitting}
                  disabled={admin.submitting}
                />
              </View>
              {config?.loginBackgroundUrl ? (
                <RemoveButton onPress={handleRemoveLoginBackground} disabled={admin.submitting} />
              ) : null}
            </View>
          </Section>

          <Section title={t('admin.branding.appLogoSection')}>
            <Preview uri={config?.appLogoUrl} contentFit="contain" />
            <View style={styles.actionRow}>
              <View style={styles.actionButton}>
                <PrimaryButton
                  title={config?.appLogoUrl ? t('admin.branding.replace') : t('admin.branding.upload')}
                  onPress={handleUploadAppLogo}
                  loading={admin.submitting}
                  disabled={admin.submitting}
                />
              </View>
              {config?.appLogoUrl ? <RemoveButton onPress={handleRemoveAppLogo} disabled={admin.submitting} /> : null}
            </View>
          </Section>

          <Section
            title={t('admin.branding.brandingAssetsSection')}
            action={
              <Pressable onPress={handleAddAssetPress} disabled={admin.submitting} hitSlop={8}>
                <Plus color={theme.primary} size={20} />
              </Pressable>
            }>
            {config?.assets?.length ? (
              config.assets.map((asset) => (
                <View key={asset.id ?? asset.name} style={[styles.assetRow, { borderColor: theme.border }]}>
                  <Image source={{ uri: asset.url }} style={styles.assetThumb} contentFit="cover" />
                  <View style={styles.assetInfo}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {asset.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      v{asset.version}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => handleReplaceAsset(asset)} disabled={admin.submitting} hitSlop={8}>
                    <ThemedText type="small" themeColor="primary">
                      {t('admin.branding.replace')}
                    </ThemedText>
                  </Pressable>
                  <Pressable onPress={() => handleRemoveAsset(asset)} disabled={admin.submitting} hitSlop={8}>
                    <Trash2 color={theme.destructive} size={18} />
                  </Pressable>
                </View>
              ))
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t('admin.branding.noAssets')}
              </ThemedText>
            )}
          </Section>
        </ScrollView>
      </View>

      <Modal animationType="slide" transparent visible={newAssetPromptVisible} onRequestClose={() => setNewAssetPromptVisible(false)}>
        <ThemedView style={styles.modalBackdrop}>
          <ThemedView type="surface" style={styles.modalCard}>
            <ThemedText type="subtitle">{t('admin.branding.newAssetTitle')}</ThemedText>
            <TextField
              value={newAssetName}
              onChangeText={setNewAssetName}
              placeholder={t('admin.branding.newAssetPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.actionRow}>
              <View style={styles.actionButton}>
                <PrimaryButton
                  title={t('common.cancel')}
                  onPress={() => {
                    setNewAssetPromptVisible(false);
                    setPendingAsset(null);
                  }}
                />
              </View>
              <View style={styles.actionButton}>
                <PrimaryButton
                  title={t('common.add')}
                  onPress={handleConfirmNewAsset}
                  loading={admin.submitting}
                  disabled={admin.submitting || !newAssetName.trim()}
                />
              </View>
            </View>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

function Preview({ uri, contentFit = 'cover' }: { uri?: string | null; contentFit?: 'cover' | 'contain' }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.previewWrapper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} contentFit={contentFit} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.branding.notSet')}
        </ThemedText>
      )}
    </View>
  );
}

function RemoveButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.removeButton} hitSlop={8}>
      <ThemedText type="smallBold" themeColor="destructive">
        {t('common.remove')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewWrapper: {
    height: PREVIEW_HEIGHT,
    borderWidth: 1,
    borderRadius: RADII.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  actionButton: {
    flex: 1,
  },
  removeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  assetThumb: {
    width: 44,
    height: 44,
    borderRadius: RADII.control,
  },
  assetInfo: {
    flex: 1,
    gap: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
  },
  modalCard: {
    borderRadius: RADII.card,
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
