/**
 * Re-exported from shared/providers/ThemeProvider so every existing
 * `@/shared/hooks/use-theme` import keeps working unchanged now that theme
 * mode is persisted/shared context state instead of a standalone
 * OS-scheme-only hook.
 */
export { useTheme } from '@/shared/providers/ThemeProvider';
