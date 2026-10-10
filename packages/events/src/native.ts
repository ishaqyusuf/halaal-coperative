import type { AnalyticsConfig } from "@ishaqyusuf/logly-core"
import type {
  NativeBatch as AnalyticsBatch,
  NativeEvent as AnalyticsEvent,
} from "./contracts"
import { packBatch } from "./batch"
import { safeRoute } from "./policy"
import {
  safeProperties,
  validEventName,
  type AnalyticsContext,
  type EventProperties,
} from "./attribution"

type Visitor = { id: string; firstSeenOn: string; lastVisitOn: string | null }
// Native deliberately uses no browser globals. IDs are installation-local and project-scoped.
export function createNativeAnalytics(options: {
  context?: AnalyticsContext | null
  endpoint: string
  enabled: boolean
  permission?: () => boolean
  appVersion?: string
  appBuild?: string
  storage: AnalyticsConfig["storage"]
  createId: () => string
  now?: () => Date
  send?: (batch: AnalyticsBatch) => Promise<void>
}) {
  const project = "halaalvest-mobile"
  const key = `logly:${project}:visitor`
  const now = options.now ?? (() => new Date())
  let context = options.context ? { ...options.context } : null
  let scope: string | undefined = options.context?.scope
  let visitor: Visitor | undefined
  let queue: AnalyticsEvent[] = []
  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight: Promise<void> | undefined
  let active = false
  let lastRoute: string | undefined
  const send =
    options.send ??
    (async (batch: AnalyticsBatch) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      try {
        const response = await fetch(options.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(batch),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Analytics delivery failed")
      } finally {
        clearTimeout(timeout)
      }
    })
  const allowed = () => {
    if (options.permission?.() !== false) return true
    queue = []
    context = null
    visitor = undefined
    scope = undefined
    lastRoute = undefined
    try {
      options.storage?.removeItem(key)
      options.storage?.removeItem(`${key}:scope`)
    } catch {}
    return false
  }
  const flush = () => {
    if (!allowed()) return Promise.resolve()
    if (inFlight) return inFlight
    if (!active || !queue.length) return Promise.resolve()
    inFlight = (async () => {
      while (active && queue.length && allowed()) {
        queue = queue.filter(
          (event) => now().getTime() - Date.parse(event.occurredAt) < 86_400_000
        )
        const batch = packBatch(queue, now().toISOString())
        if (!batch.events.length) {
          queue.shift()
          continue
        }
        try {
          await send(batch)
        } catch {
          break
        }
        const sent = new Set(batch.events.map((event) => event.eventId))
        queue = queue.filter((event) => !sent.has(event.eventId))
      }
    })().finally(() => {
      inFlight = undefined
    })
    return inFlight
  }
  const init = () => {
    if (active || !options.enabled || !allowed()) return
    try {
      scope = options.storage?.getItem(`${key}:scope`) ?? scope
      const raw = options.storage?.getItem(key)
      const stored = raw ? JSON.parse(raw) : undefined
      visitor =
        stored &&
        typeof stored.id === "string" &&
        typeof stored.firstSeenOn === "string"
          ? stored
          : {
              id: options.createId(),
              firstSeenOn: now().toISOString().slice(0, 10),
              lastVisitOn: null,
            }
      options.storage?.setItem(key, JSON.stringify(visitor))
      active = true
      timer = setInterval(() => {
        void flush()
      }, 60000)
    } catch {
      active = false
    } // Storage failures must never prevent app startup.
  }
  const trackPageView = ({ route }: { route: string }) => {
    if (!allowed() || !active || !visitor) return
    try {
      const date = now()
      if (context && date.getTime() > context.expiresAt) return
      const day = date.toISOString().slice(0, 10)
      const safe = safeRoute(route)
      const newDay = visitor.lastVisitOn !== day
      if (lastRoute === safe && !newDay) return
      const visitorId = visitor.id
      const event = (name: string): AnalyticsEvent => ({
        eventId: options.createId(),
        project,
        name,
        version: 1,
        source: "mobile",
        platform: "android",
        appVersion: options.appVersion?.slice(0, 64),
        appBuild: options.appBuild?.slice(0, 64),
        occurredAt: date.toISOString(),
        visitorId,
        route: safe,
        analyticsContext: context?.token,
        properties: {},
      })
      if (newDay) {
        queue.push({
          ...event("app_session"),
          visitKind: visitor.firstSeenOn === day ? "new" : "returning",
        })
        visitor.lastVisitOn = day
        options.storage?.setItem(key, JSON.stringify(visitor))
      }
      queue.push(event("screen_view"))
      queue = queue.slice(-250)
      lastRoute = safe
      void flush()
    } catch {
      /* Analytics is best-effort and never interrupts navigation. */
    }
  }
  const reset = () => {
    queue = []
    context = null
    lastRoute = undefined
    if (visitor) {
      visitor = {
        id: options.createId(),
        firstSeenOn: now().toISOString().slice(0, 10),
        lastVisitOn: null,
      }
      try {
        options.storage?.setItem(key, JSON.stringify(visitor))
      } catch {
        /* Best effort. */
      }
    }
  }
  return {
    init,
    track(name: string, properties: EventProperties = {}) {
      if (!allowed() || !active || !visitor || !validEventName(name))
        return false
      const date = now()
      if (context && date.getTime() > context.expiresAt) return false
      queue.push({
        eventId: options.createId(),
        project,
        name,
        version: 1,
        source: "mobile",
        platform: "android",
        occurredAt: date.toISOString(),
        visitorId: visitor.id,
        route: lastRoute,
        appVersion: options.appVersion?.slice(0, 64),
        appBuild: options.appBuild?.slice(0, 64),
        analyticsContext: context?.token,
        properties: safeProperties(properties),
      })
      queue = queue.slice(-250)
      void flush()
      return true
    },
    trackPageView,
    flush,
    reset,
    setContext(value: AnalyticsContext | null) {
      const next = value?.scope ?? "anonymous"
      if (scope !== undefined && next !== scope) reset()
      scope = next
      try {
        options.storage?.setItem(`${key}:scope`, next)
      } catch {
        /* Best effort. */
      }
      context = value ? { ...value } : null
    },
    destroy: () => {
      active = false
      if (timer) clearInterval(timer)
      queue = []
    },
  }
}
