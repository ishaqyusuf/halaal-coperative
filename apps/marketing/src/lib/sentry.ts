import * as Sentry from "@sentry/nextjs"

import {
  getMarketingErrorReport,
  isMarketingSentryEnabled,
  type MarketingErrorSource,
  sanitizeMarketingSentryEvent,
} from "./sentry-policy"

const capturedErrors = new WeakSet<object>()

function runtimeEnvironment() {
  const browser = typeof window !== "undefined"
  return {
    deploymentEnvironment: browser
      ? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT_MARKETING
      : process.env.SENTRY_ENVIRONMENT_MARKETING,
    dsn: browser
      ? process.env.NEXT_PUBLIC_SENTRY_DSN_MARKETING
      : process.env.SENTRY_DSN_MARKETING,
    nodeEnvironment: process.env.NODE_ENV,
  }
}

export function initializeMarketingSentry(input: {
  dsn?: string
  environment?: string
  release?: string
}) {
  const enabled = isMarketingSentryEnabled({
    deploymentEnvironment: input.environment,
    dsn: input.dsn,
    nodeEnvironment: process.env.NODE_ENV,
  })
  if (!enabled) return false

  Sentry.init({
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeMarketingSentryEvent(event) as unknown as typeof event,
    beforeSendTransaction: () => null,
    dsn: input.dsn,
    enableLogs: false,
    enabled,
    environment: input.environment,
    integrations: (defaults) =>
      defaults.filter(
        (integration) =>
          ![
            "Breadcrumbs",
            "BrowserSession",
            "BrowserTracing",
            "Console",
            "ContextLines",
            "Feedback",
            "Http",
            "LocalVariables",
            "Replay",
            "RequestData",
          ].includes(integration.name)
      ),
    maxBreadcrumbs: 0,
    release: input.release,
    sendClientReports: false,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
  return true
}

export function captureMarketingError(
  error: unknown,
  source: MarketingErrorSource,
  tags?: { method?: string; provider?: string }
) {
  if (!isMarketingSentryEnabled(runtimeEnvironment())) return undefined
  if (typeof error === "object" && error !== null) {
    if (capturedErrors.has(error)) return undefined
    capturedErrors.add(error)
  }
  const report = getMarketingErrorReport(error, source, tags)
  if (!report.classified.reportable) return undefined
  return Sentry.captureException(report.reportableError, report.captureContext)
}
