/**
 * Bottom padding for an action docked at the foot of a full-height screen
 * (ResultScreen, gate screens). Android is edge-to-edge, so the gesture
 * handle (or 3-button bar) sits inside `bottomInset`; padding only to the
 * inset left the button touching the handle (T02/T03, Android device). Keep a
 * clear 16pt gap above it there. iOS keeps the home-indicator inset, at
 * least 16pt on devices without one.
 */
export function resolveDockedFooterInset(
  bottomInset: number,
  platform: string
): number {
  if (platform === "android") return Math.max(bottomInset, 8) + 16
  return Math.max(bottomInset, 16)
}
