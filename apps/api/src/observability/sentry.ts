import * as Sentry from "@sentry/bun"

import {
  getApiErrorReport,
  getApiNotificationErrorReport,
  getTrpcErrorReport,
  isSentryEnabled,
  sanitizeApiSentryEvent,
} from "./sentry-policy"

let initialized = false

export function initializeApiSentry() {
  if (initialized) return true

  const dsn = process.env.SENTRY_DSN_API
  const environment = process.env.SENTRY_ENVIRONMENT_API
  const enabled = isSentryEnabled({
    deploymentEnvironment: environment,
    dsn,
    nodeEnvironment: process.env.NODE_ENV,
  })

  if (!enabled) return false

  Sentry.init({
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeApiSentryEvent(event) as unknown as typeof event,
    beforeSendTransaction: () => null,
    dsn,
    enableLogs: false,
    enabled,
    environment,
    integrations: (defaults) =>
      defaults.filter(
        (integration) =>
          ![
            "Console",
            "ContextLines",
            "Http",
            "LocalVariables",
            "RequestData",
          ].includes(integration.name)
      ),
    maxBreadcrumbs: 0,
    release: process.env.SENTRY_RELEASE_API,
    sendClientReports: false,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
  initialized = true
  return true
}

export function captureApiError(
  error: unknown,
  request: { method: string; requestId?: string }
) {
  const report = getApiErrorReport(error, request)
  if (initialized && report.classified.reportable) {
    Sentry.captureException(report.reportableError, report.captureContext)
  }
  return report
}

export function captureApiNotificationError(error: unknown) {
  const report = getApiNotificationErrorReport(error)
  if (initialized && report.classified.reportable) {
    Sentry.captureException(report.reportableError, report.captureContext)
  }
  return report
}

export function captureTrpcError(
  input: Parameters<typeof getTrpcErrorReport>[0]
) {
  if (!initialized) return undefined
  const report = getTrpcErrorReport(input)
  if (!report.classified.reportable) return undefined
  return Sentry.captureException(report.reportableError, report.captureContext)
}
