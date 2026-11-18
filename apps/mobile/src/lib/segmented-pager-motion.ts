/**
 * Lane carousel motion (02 Brand native v3): tap moves 340ms in the tap
 * direction; a swipe follows the finger and commits past 22% of the page
 * (or a flick), animating 260ms; edges rubber-band at 0.25; 24pt gap.
 */
export const PAGER_GAP = 24
export const PAGER_COMMIT_RATIO = 0.22
export const PAGER_FLICK_VELOCITY = 600
export const PAGER_RUBBER_BAND = 0.25
export const PAGER_TAP_DURATION = 340
export const PAGER_COMMIT_DURATION = 260

/** Float page position while dragging; resists past the first/last page. */
export function pagerDragPosition({
  count,
  dx,
  index,
  pageWidth,
}: {
  count: number
  dx: number
  index: number
  pageWidth: number
}) {
  "worklet"
  if (pageWidth <= 0) return index
  const raw = index - dx / (pageWidth + PAGER_GAP)
  const max = Math.max(0, count - 1)
  if (raw < 0) return raw * PAGER_RUBBER_BAND
  if (raw > max) return max + (raw - max) * PAGER_RUBBER_BAND
  return raw
}

/** The page a released swipe settles on. */
export function pagerReleaseIndex({
  count,
  dx,
  index,
  pageWidth,
  vx,
}: {
  count: number
  dx: number
  index: number
  pageWidth: number
  vx: number
}) {
  "worklet"
  const max = Math.max(0, count - 1)
  const passed = pageWidth > 0 && Math.abs(dx) > pageWidth * PAGER_COMMIT_RATIO
  const flicked = Math.abs(vx) > PAGER_FLICK_VELOCITY
  if (!passed && !flicked) return index
  const direction = (flicked ? vx : dx) < 0 ? 1 : -1
  return Math.min(max, Math.max(0, index + direction))
}

/** Movement (pt) before the swipe decides between horizontal and vertical. */
export const PAGER_SLOP = 10
/** Horizontal wins only when |dx| > 1.2·|dy| (vertical scroll stays native). */
export const PAGER_HORIZONTAL_RATIO = 1.2

export type PagerGestureDecision = "activate" | "fail" | "wait"

/**
 * Locks the lane swipe to horizontal: activate once the finger has moved
 * past the slop mostly sideways, fail as soon as it moves mostly vertically,
 * so vertical scrolling and pull-to-refresh never become a lane swipe.
 */
export function pagerGestureDecision(dx: number, dy: number): PagerGestureDecision {
  "worklet"
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax < PAGER_SLOP && ay < PAGER_SLOP) return "wait"
  return ax > PAGER_HORIZONTAL_RATIO * ay ? "activate" : "fail"
}
