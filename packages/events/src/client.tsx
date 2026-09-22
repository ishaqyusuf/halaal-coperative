"use client"
import type { AnalyticsBatch } from "@ishaqyusuf/logly-core"
import { AnalyticsProvider } from "@ishaqyusuf/logly-next"
import { useMemo, type ReactNode } from "react"
import { safeBatch } from "./policy"
import { createSafeBrowserStorage } from "./storage"

export function EventsProvider({
  children,
  surface,
}: {
  children: ReactNode
  surface: "dashboard" | "marketing"
}) {
  const storage = useMemo(() => createSafeBrowserStorage(), [])
  const project = `halaalvest-${surface}`
  const enabled =
    surface === "dashboard"
      ? process.env.NEXT_PUBLIC_LOGLY_ENABLED_DASHBOARD === "true" &&
        process.env.NEXT_PUBLIC_LOGLY_PROJECT_DASHBOARD === project
      : process.env.NEXT_PUBLIC_LOGLY_ENABLED_MARKETING === "true" &&
        process.env.NEXT_PUBLIC_LOGLY_PROJECT_MARKETING === project
  async function transport(batch: AnalyticsBatch) {
    const sanitized = safeBatch(batch, project)
    if (!sanitized.events.length) return
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sanitized),
      keepalive: true,
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) throw new Error("Analytics delivery failed")
  }
  return (
    <AnalyticsProvider
      project={project}
      storage={storage}
      endpoint="/api/analytics"
      disabled={!enabled}
      respectPrivacySignals
      autoTrackPageViews
      transport={transport}
    >
      {children}
    </AnalyticsProvider>
  )
}
