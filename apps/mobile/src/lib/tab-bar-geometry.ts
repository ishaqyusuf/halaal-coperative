/** Keep the 56dp tab targets above the system gesture/navigation area. */
export function resolveTabBarGeometry(bottomInset: number) {
  const safeBottom = Number.isFinite(bottomInset) ? Math.max(8, bottomInset) : 8

  return {
    height: 64 + safeBottom,
    paddingBottom: safeBottom + 4,
    paddingTop: 4,
  }
}
