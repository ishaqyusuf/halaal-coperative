export function resolveScreenStatusBar(input: {
  androidApiLevel?: number
  background: string
  brandSurface: string
  colorScheme: "light" | "dark"
  focused: boolean
  tone: "background" | "brand"
}) {
  if (!input.focused) return null

  return {
    backgroundColor:
      input.tone === "brand" ? input.brandSurface : input.background,
    // Android 15+ draws the system bar over the window theme surface even
    // when a screen requests a different backgroundColor at runtime.
    style:
      (input.tone === "brand" && (input.androidApiLevel ?? 0) < 35) ||
      input.colorScheme === "dark"
        ? ("light" as const)
        : ("dark" as const),
  }
}
