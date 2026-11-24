/**
 * Home's floating Add payment pill (T31): it shows "+ Add payment" near the
 * top and folds to a "+" circle once the member scrolls down past 48pt, then
 * opens again only back near the top (not on every upward flick).
 */
export const PAY_PILL_COLLAPSE_OFFSET = 48

export function resolvePayPillExpanded(input: {
  expanded: boolean
  previousY: number
  y: number
}) {
  if (input.y <= PAY_PILL_COLLAPSE_OFFSET) return true
  if (input.y > input.previousY) return false
  return input.expanded
}
