import type { AnalyticsConfig } from "@ishaqyusuf/logly-core"
import {
  safeProperties,
  validEventName,
  type AnalyticsContext,
  type EventProperties,
} from "./attribution"
import type { BrowserBatch } from "./contracts"
import { packBatch } from "./batch"
import { safeRoute } from "./policy"

// Memory-only queue: signed capture context must never be rebound by another tab/client.
export function createBrowserAnalytics(options: {
  project: string
  storage: NonNullable<AnalyticsConfig["storage"]>
  send: (batch: BrowserBatch) => Promise<void>
  now?: () => number
  createId?: () => string
}) {
  const now = options.now ?? Date.now
  const createId = options.createId ?? (() => crypto.randomUUID())
  const key = `logly:${options.project}:visitor`
  let context: AnalyticsContext | null = null
  let contextReady = false
  let scope: string | undefined
  let queue: BrowserBatch["events"] = []
  let inFlight: Promise<void> | undefined
  let active = true
  let enabled = true
  let lastRoute: string | undefined
  let visitor: { id: string; firstSeenOn: string; lastVisitOn: string | null }
  const freshVisitor = () => ({
    id: createId(),
    firstSeenOn: new Date(now()).toISOString().slice(0, 10),
    lastVisitOn: null,
  })
  try {
    scope = options.storage.getItem(`${key}:scope`) ?? undefined
    const stored = JSON.parse(options.storage.getItem(key) ?? "null")
    visitor =
      stored &&
      typeof stored.id === "string" &&
      typeof stored.firstSeenOn === "string"
        ? stored
        : freshVisitor()
  } catch {
    visitor = freshVisitor()
  }
  const save = () => options.storage.setItem(key, JSON.stringify(visitor))
  const privacyAllowed = () => {
    const denied =
      typeof navigator !== "undefined" &&
      (navigator.doNotTrack === "1" ||
        (navigator as Navigator & { globalPrivacyControl?: boolean })
          .globalPrivacyControl)
    if (!denied) return true
    queue = []
    context = null
    contextReady = false
    lastRoute = undefined
    visitor = freshVisitor()
    options.storage.removeItem(key)
    options.storage.removeItem(`${key}:scope`)
    scope = undefined
    return false
  }
  const flush = () => {
    if (!enabled || !contextReady || !privacyAllowed()) return Promise.resolve()
    if (inFlight) return inFlight
    if (!active || !queue.length) return Promise.resolve()
    inFlight = (async () => {
      while (
        active &&
        enabled &&
        contextReady &&
        queue.length &&
        privacyAllowed()
      ) {
        queue = queue.filter(
          (event) => now() - Date.parse(event.occurredAt) < 86_400_000
        )
        const batch = packBatch(queue, new Date(now()).toISOString())
        if (!batch.events.length) {
          queue.shift()
          continue
        }
        try {
          await options.send(batch)
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
  const reset = () => {
    queue = []
    context = null
    contextReady = false
    lastRoute = undefined
    visitor = freshVisitor()
    save()
  }
  return {
    setEnabled(value: boolean) {
      enabled = value
      if (!value) {
        reset()
        options.storage.removeItem(key)
        options.storage.removeItem(`${key}:scope`)
        scope = undefined
      }
    },
    pauseCapture: () => {
      contextReady = false
    },
    setContext(value: AnalyticsContext | null) {
      if (!enabled) return
      const next = value?.scope ?? "anonymous"
      if (scope !== undefined && next !== scope) reset()
      scope = next
      options.storage.setItem(`${key}:scope`, next)
      context = value ? { ...value } : null
      contextReady = true
    },
    track(name: string, properties: EventProperties = {}) {
      if (
        !active ||
        !enabled ||
        !contextReady ||
        !privacyAllowed() ||
        !validEventName(name)
      )
        return false
      const timestamp = now()
      if (context && timestamp > context.expiresAt) return false
      queue.push({
        eventId: createId(),
        project: options.project,
        name,
        version: 1,
        source: "browser",
        occurredAt: new Date(timestamp).toISOString(),
        visitorId: visitor.id,
        route: lastRoute,
        properties: safeProperties(properties),
        analyticsContext: context?.token,
      })
      queue = queue.slice(-250)
      void flush()
      return true
    },
    trackPageView(route: string) {
      if (!active || !enabled || !contextReady) return
      if (!privacyAllowed()) return
      const timestamp = now()
      if (context && timestamp > context.expiresAt) return
      const day = new Date(timestamp).toISOString().slice(0, 10)
      const safe = safeRoute(route)
      const newDay = visitor.lastVisitOn !== day
      if (lastRoute === safe && !newDay) return
      const event = (name: string): BrowserBatch["events"][number] => ({
        eventId: createId(),
        project: options.project,
        name,
        version: 1,
        source: "browser",
        occurredAt: new Date(timestamp).toISOString(),
        visitorId: visitor.id,
        route: safe,
        properties: {},
        analyticsContext:
          context && timestamp <= context.expiresAt ? context.token : undefined,
      })
      if (newDay) {
        queue.push({
          ...event("site_visit"),
          visitKind: visitor.firstSeenOn === day ? "new" : "returning",
        })
        visitor.lastVisitOn = day
        save()
      }
      queue.push(event("page_view"))
      queue = queue.slice(-250)
      lastRoute = safe
      void flush()
    },
    flush,
    reset,
    destroy: () => {
      active = false
      queue = []
      context = null
    },
  }
}
