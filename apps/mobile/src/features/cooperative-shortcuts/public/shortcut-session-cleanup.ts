import { cooperativeShortcutService } from "../platform/cooperative-shortcut-instance"

/**
 * Shared sign-out/401/revocation hook: disables this install's cooperative
 * shortcuts best effort. Bounded and non-throwing, so local session
 * invalidation never waits on, or fails because of, the launcher.
 */
export function disableCooperativeShortcutsForSignOut() {
  return cooperativeShortcutService.signOutCleanup()
}
