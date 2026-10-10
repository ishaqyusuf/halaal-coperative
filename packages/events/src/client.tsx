"use client"
import { usePathname } from "next/navigation"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react"
import type { AnalyticsContext, EventProperties } from "./attribution"
import { createContextRefreshLoop } from "./browser-context"
import { createBrowserAnalytics } from "./browser"
import { createSafeBrowserStorage } from "./storage"

type EventsClient = ReturnType<typeof createBrowserAnalytics>
const EventsContext = createContext<{
  track: (name: string, properties?: EventProperties) => boolean
}>({ track: () => false })
export function useEvents() {
  return useContext(EventsContext)
}

export function EventsProvider({
  children,
  surface,
}: {
  children: ReactNode
  surface: "dashboard" | "marketing"
}) {
  const client = useRef<EventsClient | null>(null)
  const value = useMemo(
    () => ({
      track: (name: string, properties?: EventProperties) =>
        client.current?.track(name, properties) ?? false,
    }),
    []
  )
  return (
    <EventsContext.Provider value={value}>
      {children}
      <NavigationEvents surface={surface} client={client} />
    </EventsContext.Provider>
  )
}
function NavigationEvents({
  surface,
  client,
}: {
  surface: "dashboard" | "marketing"
  client: RefObject<EventsClient | null>
}) {
  const pathname = usePathname()
  const storage = useMemo(() => createSafeBrowserStorage(), [])
  const project = `halaalvest-${surface}`
  const enabled =
    surface === "dashboard"
      ? process.env.NEXT_PUBLIC_LOGLY_ENABLED_DASHBOARD === "true" &&
        process.env.NEXT_PUBLIC_LOGLY_PROJECT_DASHBOARD === project
      : process.env.NEXT_PUBLIC_LOGLY_ENABLED_MARKETING === "true" &&
        process.env.NEXT_PUBLIC_LOGLY_PROJECT_MARKETING === project
  useEffect(() => {
    if (!enabled) return
    const analytics = createBrowserAnalytics({
      project,
      storage,
      send: async (batch) => {
        const response = await fetch("/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(batch),
          keepalive: true,
          signal: AbortSignal.timeout(4000),
        })
        if (!response.ok) throw new Error("Analytics delivery failed")
      },
    })
    client.current = analytics
    const timer = setInterval(() => {
      void analytics.flush()
    }, 60_000)
    const flush = () => {
      void analytics.flush()
    }
    window.addEventListener("pagehide", flush)
    return () => {
      clearInterval(timer)
      window.removeEventListener("pagehide", flush)
      client.current = null
      analytics.destroy()
    }
  }, [enabled, project, storage, client])
  useEffect(() => {
    if (!enabled || !pathname) return
    const controller = new AbortController()
    let policyEnabled = false
    const refreshLoop = createContextRefreshLoop({
      pending: () => client.current?.pauseCapture(),
      load: async () => {
        const response = await fetch("/api/analytics/context", {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(4000),
          ]),
        })
        if (!response.ok) throw new Error("Analytics context unavailable")
        const decision = (await response.json()) as {
          enabled?: unknown
          context?: AnalyticsContext | null
        }
        if (typeof decision.enabled !== "boolean")
          throw new Error("Analytics policy unavailable")
        policyEnabled = decision.enabled
        return decision.context ?? null
      },
      apply: (context) => {
        client.current?.setEnabled(policyEnabled)
        client.current?.setContext(context)
        client.current?.trackPageView(pathname)
        void client.current?.flush()
      },
    })
    const capture = () => {
      void refreshLoop.refresh()
    }
    capture()
    window.addEventListener("focus", capture)
    return () => {
      refreshLoop.dispose()
      controller.abort()
      window.removeEventListener("focus", capture)
    }
  }, [enabled, pathname, surface, client])
  return null
}
