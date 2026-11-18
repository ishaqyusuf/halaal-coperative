import { useCooperativeShortcuts } from "../platform/cooperative-shortcut-runtime-provider"

export type { PendingShortcutCooperative } from "../platform/cooperative-shortcut-runtime-provider"

/**
 * The cooperative a signed-out home-screen shortcut tap is opening, for the
 * sign-in screen to brand itself with, and a way back to the plain sign-in.
 */
export function useShortcutSignInCooperative() {
  const shortcuts = useCooperativeShortcuts()
  return {
    clear: shortcuts.clearPendingLaunch,
    cooperative: shortcuts.pendingCooperative,
  }
}
