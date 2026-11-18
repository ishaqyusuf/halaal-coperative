export type ScreenStatusBarTone = "background" | "brand" | "hero" | "surface"

/**
 * The one status-bar policy. Screens never render expo-status-bar directly;
 * they use ScreenStatusBar / OverlayStatusBar (components/app/screen-status-bar)
 * or ScreenShell, which resolve through here.
 *
 * The bar is always transparent and the app draws what sits under it (T03):
 * Android is edge-to-edge, and a painted bar colour left a flat strip and a
 * seam above gradient heroes. Only the icon style is chosen here.
 *
 * - background / surface: the canvas or the scrolled-hero strip ScreenShell
 *   paints under the bar; icons follow the theme.
 * - brand / hero: a coloured header drawn under the bar; light icons.
 */
export function resolveScreenStatusBar(input: {
  colorScheme: "light" | "dark"
  focused: boolean
  tone: ScreenStatusBarTone
}) {
  if (!input.focused) return null

  const coloured = input.tone === "brand" || input.tone === "hero"
  return {
    style:
      coloured || input.colorScheme === "dark"
        ? ("light" as const)
        : ("dark" as const),
  }
}
