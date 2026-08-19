import { AppHeader } from '@/shared/components/AppHeader';

type Props = {
  title: string;
  handle?: string | null;
  showBack?: boolean;
};

/**
 * Settings' centred title + `@handle` subtitle (see .docs/SETTINGS_REDESIGN_2.md §5).
 * The layout now lives in the shared AppHeader so Settings, Home and Podcast
 * all render a bar of exactly the same height; this stays as the Settings-
 * flavoured name (`handle`) its screens already call.
 */
export function SettingsHeader({ title, handle, showBack = true }: Props) {
  return <AppHeader title={title} subtitle={handle} showBack={showBack} />;
}
