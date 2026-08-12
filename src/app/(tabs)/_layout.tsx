import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useAuth } from '@/core/auth';
import { useTheme } from '@/shared/hooks/use-theme';

function tabIcon(name: SymbolViewProps['name']) {
  return ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <SymbolView name={name} tintColor={color} size={size} />
  );
}

/**
 * Tabs are gated by the realm's FUNC_TAB_* authorities (see
 * skateboard-podcast-be/.docker/keycloak/realm-export.json) — `href: null`
 * hides a tab from the bar and blocks direct navigation to it, matching
 * what the BFF itself enforces server-side for the same claim.
 */
export default function TabsLayout() {
  const { hasAuthority } = useAuth();
  const theme = useTheme();

  const gate = (authority: string) => (hasAuthority(authority) ? undefined : null);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: gate('FUNC_TAB_HOME'),
          tabBarIcon: tabIcon({ ios: 'house.fill', android: 'home', web: 'home' }),
        }}
      />
      <Tabs.Screen
        name="podcast"
        options={{
          title: 'Podcast',
          href: gate('FUNC_TAB_PODCAST'),
          tabBarIcon: tabIcon({ ios: 'mic.fill', android: 'mic', web: 'mic' }),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          href: gate('FUNC_TAB_FEED'),
          tabBarIcon: tabIcon({ ios: 'newspaper.fill', android: 'article', web: 'article' }),
        }}
      />
      <Tabs.Screen
        name="skate-square"
        options={{
          title: 'Skate Square',
          href: gate('FUNC_TAB_SKATE_SQUARE'),
          tabBarIcon: tabIcon({ ios: 'person.3.fill', android: 'groups', web: 'groups' }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: gate('FUNC_TAB_SETTINGS'),
          tabBarIcon: tabIcon({ ios: 'gearshape.fill', android: 'settings', web: 'settings' }),
        }}
      />
    </Tabs>
  );
}
