import type * as SentrySdk from "@sentry/nextjs"

import {
  type DashboardErrorSource,
  getDashboardErrorReport,
  getDashboardTrpcErrorReport,
  isDashboardSentryEnabled,
  sanitizeDashboardSentryEvent,
} from "./sentry-policy"

const capturedErrors = new WeakSet<object>()
let sentrySdk: Promise<typeof SentrySdk | null> | undefined

// The SDK is only fetched once Sentry is enabled, so it stays out of the
// client bootstrap bundle. Captures chain on the same promise as `init`, so
// they run after it. A failed chunk load drops the report and retries later.
function loadSentry() {
  sentrySdk ??= import("@sentry/nextjs").catch(() => {
    sentrySdk = undefined
    return null
  })
  return sentrySdk
}

function runtimeEnvironment() {
  const browser = typeof window !== "undefined"
  return {
    deploymentEnvironment: browser
      ? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT_DASHBOARD
      : process.env.SENTRY_ENVIRONMENT_DASHBOARD,
    dsn: browser
      ? process.env.NEXT_PUBLIC_SENTRY_DSN_DASHBOARD
      : process.env.SENTRY_DSN_DASHBOARD,
    nodeEnvironment: process.env.NODE_ENV,
  }
}

export async function initializeDashboardSentry(input: {
  dsn?: string
  environment?: string
  release?: string
}) {
  const enabled = isDashboardSentryEnabled({
    deploymentEnvironment: input.environment,
    dsn: input.dsn,
    nodeEnvironment: process.env.NODE_ENV,
  })
  if (!enabled) return false

  const Sentry = await loadSentry()
  if (!Sentry) return false

  Sentry.init({
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeDashboardSentryEvent(event) as unknown as typeof event,
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

export async function captureDashboardError(
  error: unknown,
  source: DashboardErrorSource,
  tags?: { method?: string }
) {
  if (!isDashboardSentryEnabled(runtimeEnvironment())) return undefined
  if (typeof error === "object" && error !== null) {
    if (capturedErrors.has(error)) return undefined
    capturedErrors.add(error)
  }

  const report = getDashboardErrorReport(error, source, tags)
  if (!report.classified.reportable) return undefined
  const Sentry = await loadSentry()
  return Sentry?.captureException(report.reportableError, report.captureContext)
}

/** Reports a failure from the hosted tRPC router through the dashboard SDK. */
export async function captureDashboardTrpcError(
  input: Parameters<typeof getDashboardTrpcErrorReport>[0]
) {
  if (!isDashboardSentryEnabled(runtimeEnvironment())) return undefined
  const report = getDashboardTrpcErrorReport(input)
  if (!report.classified.reportable) return undefined
  const Sentry = await loadSentry()
  return Sentry?.captureException(report.reportableError, report.captureContext)
}
