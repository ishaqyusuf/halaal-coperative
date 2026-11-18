/** Keep the 56dp tab targets above the system gesture/navigation area. */
export function resolveTabBarGeometry(bottomInset: number) {
  const safeBottom = Number.isFinite(bottomInset) ? Math.max(8, bottomInset) : 8

  return {
    height: 64 + safeBottom,
    paddingBottom: safeBottom + 4,
    paddingTop: 4,
  }
}

/**
 * The 02 floating dock: a 64pt pill inset 14 from the sides, floating 24pt
 * above the bottom on a home-indicator phone. `contentInset` is the scroll
 * padding a screen needs so its last row clears the dock; `fabBottom` seats
 * a FAB or the tab search bubble just above it.
 */
export function resolveDockGeometry(bottomInset: number, platform?: string) {
  const inset = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0
  // iOS: the home indicator sits low in its 34pt inset, so the dock may dip
  // 10pt into it. Android (edge-to-edge): the gesture handle sits mid-inset,
  // so the dock floats above the whole inset (T03: the handle crossed the
  // dock labels on the emulator).
  const bottom =
    platform === "android" ? Math.max(inset + 8, 16) : Math.max(inset - 10, 12)
  const height = 64
  return {
    bottom,
    contentInset: bottom + height + 24,
    fabBottom: bottom + height + 14,
    height,
    side: 14,
  }
}
