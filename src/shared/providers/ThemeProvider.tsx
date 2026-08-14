import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { secureStorage } from '@/core/storage/secureStorage';
import { Colors, type ThemeColor } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'skateboard.themeMode';
const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  isLoaded: boolean;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Owns the user's theme preference separately from the resolved light/dark
 * palette. `system` follows the OS color scheme; `light` and `dark` are
 * persisted overrides via core/storage/secureStorage.
 */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);
  const resolvedMode: ResolvedThemeMode = mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  useEffect(() => {
    (async () => {
      try {
        const stored = await secureStorage.getItem(THEME_STORAGE_KEY);
        if (isThemeMode(stored)) {
          setModeState(stored);
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    secureStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const cycleMode = useCallback(() => {
    const nextIndex = (THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length;
    setMode(THEME_MODES[nextIndex]);
  }, [mode, setMode]);

  const toggleMode = useCallback(() => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  }, [resolvedMode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedMode, isLoaded, setMode, cycleMode, toggleMode }),
    [mode, resolvedMode, isLoaded, setMode, cycleMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme/useThemeMode must be used within AppThemeProvider');
  }
  return context;
}

/** Resolved color tokens for the current mode — same shape every screen already reads (`theme.text`, etc.). */
export function useTheme(): Record<ThemeColor, string> {
  const { resolvedMode } = useThemeContext();
  return Colors[resolvedMode];
}

/** Mode + control, for Settings and navigation theme wiring. */
export function useThemeMode() {
  return useThemeContext();
}
