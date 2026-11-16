export type ScreenStatusBarTone = "background" | "brand" | "hero" | "surface"

/**
 * The one status-bar policy. Screens never render expo-status-bar directly;
 * they use ScreenStatusBar / OverlayStatusBar (components/app/screen-status-bar)
 * or ScreenShell, which resolve through here.
 *
 * - background: the screen canvas, theme icons.
 * - brand / hero: a coloured header under the bar, light icons.
 * - surface: a scrolled hero screen's painted strip (card), theme icons.
 */
export function resolveScreenStatusBar(input: {
  androidApiLevel?: number
  background: string
  brandSurface: string
  colorScheme: "light" | "dark"
  focused: boolean
  heroStart?: string
  surface?: string
  tone: ScreenStatusBarTone
}) {
  if (!input.focused) return null

  const coloured = input.tone === "brand" || input.tone === "hero"
  return {
    backgroundColor:
      input.tone === "brand"
        ? input.brandSurface
        : input.tone === "hero"
          ? (input.heroStart ?? input.brandSurface)
          : input.tone === "surface"
            ? (input.surface ?? input.background)
            : input.background,
    // Android 15+ draws the system bar over the window theme surface even
    // when a screen requests a different backgroundColor at runtime. A hero
    // paints its own strip under the bar, so it always keeps light icons.
    style:
      (input.tone === "brand" && (input.androidApiLevel ?? 0) < 35) ||
      input.tone === "hero" ||
      (!coloured && input.colorScheme === "dark") ||
      (input.tone === "brand" && input.colorScheme === "dark")
        ? ("light" as const)
        : ("dark" as const),
  }
}
