// Pre-launch cost policy: Neon suspends compute after five idle minutes, so a
// visible but unattended tab that polls keeps the database awake all day.
// Polling runs only while the page is visible, online and recently used;
// focus/visibility refetch and mutation invalidation cover the gaps.
export const LIVE_TABLE_POLL_INTERVAL_MS = 30_000
export const LIVE_TABLE_IDLE_AFTER_MS = 5 * 60_000

export type LivePollingSignals = {
  lastActivityAt: number
  now: number
  online: boolean
  visible: boolean
}

export function isLivePollingActive(signals: LivePollingSignals) {
  return (
    signals.visible &&
    signals.online &&
    signals.now - signals.lastActivityAt < LIVE_TABLE_IDLE_AFTER_MS
  )
}

export function resolveLiveTablePollInterval(
  signals: LivePollingSignals
): number | false {
  return isLivePollingActive(signals) ? LIVE_TABLE_POLL_INTERVAL_MS : false
}

// Milliseconds until an active session turns idle, so the caller can schedule
// one timer instead of re-checking on an interval.
export function msUntilLivePollingIdle(signals: LivePollingSignals) {
  return Math.max(
    0,
    signals.lastActivityAt + LIVE_TABLE_IDLE_AFTER_MS - signals.now
  )
}
