import type { AnalyticsBatch } from "@ishaqyusuf/logly-core"

const routeNames = new Set([
  "",
  "sign-in",
  "login",
  "sign-up",
  "register",
  "overview",
  "dashboard",
  "members",
  "contributions",
  "financing",
  "loans",
  "repayments",
  "settings",
  "reports",
  "notifications",
  "support",
  "pricing",
  "about",
  "contact",
  "features",
])
export function safeRoute(route?: string) {
  const first = route?.split(/[?#]/)[0]?.split("/").filter(Boolean)[0] ?? ""
  return routeNames.has(first) ? `/${first}` : "/other"
}

export function safeBatch(
  batch: AnalyticsBatch,
  project: string
): AnalyticsBatch {
  return {
    sentAt: batch.sentAt,
    sdk: batch.sdk,
    events: batch.events
      .filter(
        (event) => event.name === "site_visit" || event.name === "page_view"
      )
      .map((event) => ({
        eventId: event.eventId,
        project,
        name: event.name,
        version: 1,
        source: "browser",
        occurredAt: event.occurredAt,
        visitorId: event.visitorId,
        visitKind: event.visitKind,
        route: safeRoute(event.route),
        properties: {},
      })),
  }
}

export function isAllowedOrigin(origin: string, allowed: string[]) {
  try {
    const url = new URL(origin)
    return (
      url.protocol === "https:" &&
      url.origin === origin &&
      allowed.includes(origin)
    )
  } catch {
    return false
  }
}

export function safeNativeBatch(
  batch: import("./contracts").NativeBatch
): import("./contracts").NativeBatch {
  return {
    sentAt: batch.sentAt,
    sdk: { name: "@ishaqyusuf/logly-core", version: "0.3.0" },
    events: batch.events
      .filter(
        (event) => event.name === "app_session" || event.name === "screen_view"
      )
      .map((event) => ({
        eventId: event.eventId,
        project: "halaalvest-mobile",
        name: event.name,
        version: 1,
        source: "mobile",
        platform: "android",
        occurredAt: event.occurredAt,
        visitorId: event.visitorId,
        visitKind: event.visitKind,
        appVersion: event.appVersion,
        appBuild: event.appBuild,
        route: safeRoute(event.route),
        properties: {},
      })),
  }
}
