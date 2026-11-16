/**
 * The AppSheet presentation rule (ADR-20261116 mobile native-feel rules, §2).
 *
 * - `form`: any content with an input. Always the full-screen modal.
 * - `confirm` / `picker`: destructive confirmations and short pickers. Always
 *   the floating sheet (pickers scroll inside it).
 * - `auto`: read-only content. Floating while the measured sheet (content +
 *   chrome) fits within half the window; taller content expands into the
 *   full-screen presentation. Once expanded it stays expanded until closed,
 *   so late-loading content cannot bounce it back and forth.
 */
export type AppSheetVariant = "auto" | "confirm" | "form" | "picker"
export type AppSheetPresentation = "floating" | "fullscreen"

/** Handle + centred title row, or handle only. */
export const FLOATING_SHEET_CHROME = { titled: 60, untitled: 28 } as const
export const FLOATING_SHEET_MAX_RATIO = 0.5

export function resolveAppSheetPresentation({
  contentHeight,
  previous,
  titled = true,
  variant,
  windowHeight,
}: {
  /** Measured content + footer height; null while not measured yet. */
  contentHeight: number | null
  /** The presentation already on screen for this open, if any. */
  previous?: AppSheetPresentation | null
  titled?: boolean
  variant: AppSheetVariant
  windowHeight: number
}): AppSheetPresentation | null {
  if (variant === "form") return "fullscreen"
  if (variant === "confirm" || variant === "picker") return "floating"
  if (previous === "fullscreen") return "fullscreen"
  if (contentHeight === null || !(windowHeight > 0)) return previous ?? null

  const chrome = titled
    ? FLOATING_SHEET_CHROME.titled
    : FLOATING_SHEET_CHROME.untitled
  return contentHeight + chrome > windowHeight * FLOATING_SHEET_MAX_RATIO
    ? "fullscreen"
    : "floating"
}
