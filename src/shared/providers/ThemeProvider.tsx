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

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'skateboard.themeMode';

interface ThemeContextValue {
  mode: ThemeMode;
  isLoaded: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Owns the resolved theme mode so every consumer shares one value instead
 * of independently re-deriving it — needed once the mode can be a
 * user-persisted override, not just the OS color scheme. Defaults to the
 * OS scheme on first launch, then to whatever was last persisted via
 * core/storage/secureStorage.
 */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === 'light' ? 'light' : 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await secureStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
          setModeState(stored);
        }
      } finally {
        setIsLoaded(true);
      }
    })();
    // Intentionally read the persisted override once at startup only — an
    // explicit user choice should stick even if the OS scheme changes later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    secureStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isLoaded, setMode, toggleMode }),
    [mode, isLoaded, setMode, toggleMode]
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
  const { mode } = useThemeContext();
  return Colors[mode];
}

/** Mode + control, for the one place that needs it (the Settings appearance toggle). */
export function useThemeMode() {
  return useThemeContext();
}
