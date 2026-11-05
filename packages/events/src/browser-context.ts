import type { AnalyticsContext } from "./attribution"

export function createContextRefreshLoop(options: {
  load: () => Promise<AnalyticsContext | null>
  pending: () => void
  apply: (context: AnalyticsContext | null) => void
  now?: () => number
  schedule?: (callback: () => void, delay: number) => () => void
  /**
   * Timed refreshes are skipped while this returns false (hidden tab); the
   * caller refreshes again on focus/visibility so no timer wakes the server
   * for a page nobody is looking at.
   */
  isActive?: () => boolean
}) {
  const now = options.now ?? Date.now
  const schedule =
    options.schedule ??
    ((callback: () => void, delay: number) => {
      const timer = setTimeout(callback, delay)
      return () => clearTimeout(timer)
    })
  let cancelPending: (() => void) | undefined
  let generation = 0
  let disposed = false
  const clear = () => {
    cancelPending?.()
    cancelPending = undefined
  }
  const refresh = async () => {
    if (disposed) return
    clear()
    const current = ++generation
    options.pending()
    let delay: number | null = 60_000
    try {
      const context = await options.load()
      if (disposed || generation !== current) return
      options.apply(context)
      // A null context is the server's decision that capture is off; it is
      // re-read on navigation or focus, not polled.
      delay = context
        ? Math.max(1000, context.expiresAt - now() - 60_000)
        : null
    } catch {
      // Keep capture paused and retry after a bounded delay; app interactions continue.
    }
    if (!disposed && generation === current && delay !== null) {
      cancelPending = schedule(() => {
        if (options.isActive?.() === false) return
        void refresh()
      }, delay)
    }
  }
  return {
    refresh,
    dispose: () => {
      disposed = true
      generation++
      clear()
    },
  }
}
