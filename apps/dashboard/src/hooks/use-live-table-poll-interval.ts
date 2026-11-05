"use client"

import { useSyncExternalStore } from "react"
import {
  LIVE_TABLE_POLL_INTERVAL_MS,
  isLivePollingActive,
  msUntilLivePollingIdle,
} from "@/lib/live-polling-policy"

const activityEvents = ["keydown", "pointerdown", "wheel", "touchstart"] as const

let lastActivityAt = Date.now()
let active = true
let idleTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function readSignals() {
  return {
    lastActivityAt,
    now: Date.now(),
    online: navigator.onLine,
    visible: document.visibilityState === "visible",
  }
}

function recompute() {
  const signals = readSignals()
  const next = isLivePollingActive(signals)
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = next
    ? setTimeout(recompute, msUntilLivePollingIdle(signals) + 50)
    : undefined
  if (next === active) return
  active = next
  for (const listener of listeners) listener()
}

function markActivity() {
  lastActivityAt = Date.now()
  // Only a transition back to active needs a recompute; while active the
  // idle timer is simply pushed out on its next firing.
  if (!active) recompute()
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") lastActivityAt = Date.now()
  recompute()
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    for (const event of activityEvents) {
      window.addEventListener(event, markActivity, { passive: true })
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("online", recompute)
    window.addEventListener("offline", recompute)
    lastActivityAt = Date.now()
    recompute()
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return
    for (const event of activityEvents) {
      window.removeEventListener(event, markActivity)
    }
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("online", recompute)
    window.removeEventListener("offline", recompute)
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = undefined
  }
}

/**
 * Refetch interval for tables that still need background freshness. Returns
 * `false` once the tab is hidden, offline or idle so an unattended dashboard
 * stops issuing SQL and lets the database suspend.
 */
export function useLiveTablePollInterval(): number | false {
  const isActive = useSyncExternalStore(
    subscribe,
    () => active,
    () => false
  )
  return isActive ? LIVE_TABLE_POLL_INTERVAL_MS : false
}
