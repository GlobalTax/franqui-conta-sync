import { useGlobalShortcuts } from '@/lib/shortcuts/ShortcutManager';

/**
 * Wrapper component to enable global shortcuts inside Router context
 */
export function GlobalShortcutsWrapper() {
  useGlobalShortcuts();
  return null;
}
