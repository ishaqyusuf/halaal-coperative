export const LARGE_TEXT_FONT_SCALE = 1.5
export const LARGE_TEXT_EFFECTIVE_WIDTH = 280
export const DISPLAY_TEXT_FONT_SCALE_CAP = 1.6

export function resolveDisplayTextScale(fontScale: number) {
  const safeFontScale = Number.isFinite(fontScale) ? Math.max(fontScale, 1) : 1

  return Math.min(safeFontScale, DISPLAY_TEXT_FONT_SCALE_CAP)
}

export function shouldUseLargeTextLayout({
  fontScale,
  width,
}: {
  fontScale: number
  width: number
}) {
  const safeFontScale = Number.isFinite(fontScale) ? Math.max(fontScale, 1) : 1
  const effectiveWidth = width / safeFontScale

  return (
    safeFontScale >= LARGE_TEXT_FONT_SCALE ||
    effectiveWidth < LARGE_TEXT_EFFECTIVE_WIDTH
  )
}
