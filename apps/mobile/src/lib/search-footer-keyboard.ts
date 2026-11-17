/**
 * KeyboardStickyView offsets for the floating search footer (T03, owner
 * report: the pill sat too high above the keyboard). The footer pads its
 * bottom by the safe-area inset (or 8) plus a 10pt gap so it clears the home
 * indicator or gesture bar when the keyboard is closed. The keyboard height
 * already covers that area, so while it is open the view moves down by the
 * same padding, leaving a constant 10pt gap above the keyboard on iOS and
 * Android. `closed` keeps the footer lifted above a tab dock (bottomOffset).
 */
export function resolveSearchFooterKeyboardOffset({
  bottomOffset,
  safeAreaPadding,
}: {
  bottomOffset: number
  safeAreaPadding: number
}) {
  return { closed: -bottomOffset, opened: safeAreaPadding }
}
