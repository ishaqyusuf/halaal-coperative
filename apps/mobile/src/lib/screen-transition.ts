/**
 * One motion language for moving between screens, shared by every navigator:
 *
 * - Tabs shift: a short cross-fade with a small directional slide, so moving
 *   right along the dock carries content left and back again.
 * - Pushed screens slide in from the right on both platforms, with swipe back.
 * - Task screens that stand apart from the app (the assistant) rise from the
 *   bottom.
 * - Gates (sign-in, role switch, app access) fade; their options stay on the
 *   gate screens themselves.
 *
 * Reduce Motion turns tab motion off and every stack move into a fade.
 */

export type TabTransition = { animation: "shift" | "none" }

export type StackAnimation = "fade" | "slide_from_bottom" | "slide_from_right"

export type StackTransition = {
  animation: StackAnimation
  gestureEnabled: true
}

/** Routes that open as their own task rather than a step deeper in the app. */
const RISING_ROUTES = new Set(["ask-assistant"])

export function tabTransition(reduceMotion: boolean): TabTransition {
  return { animation: reduceMotion ? "none" : "shift" }
}

export function stackTransition(
  routeName: string,
  reduceMotion: boolean
): StackTransition {
  if (reduceMotion) return { animation: "fade", gestureEnabled: true }
  return {
    animation: RISING_ROUTES.has(routeName)
      ? "slide_from_bottom"
      : "slide_from_right",
    gestureEnabled: true,
  }
}
