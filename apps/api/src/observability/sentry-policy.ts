import {
  buildErrorReport,
  isObservabilityEnabled,
  sanitizeSentryEvent,
} from "@halaalvest/observability"
import type { TRPCError } from "@trpc/server"

type TrpcErrorDetails = {
  error: TRPCError
  path?: string
  requestId?: string
  router: "app"
  type: "mutation" | "query" | "subscription" | "unknown"
}

type SentryEnvironmentInput = {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}

const OBSERVABILITY_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getSafeObservabilityRequestId(value?: string) {
  const normalized = value?.trim()
  return normalized && OBSERVABILITY_REQUEST_ID_PATTERN.test(normalized)
    ? normalized
    : undefined
}

export function isSentryEnabled(input: SentryEnvironmentInput) {
  return isObservabilityEnabled(input)
}

export function sanitizeApiSentryEvent(event: unknown) {
  return sanitizeSentryEvent(event, {
    allowedTagKeys: ["method", "procedure_type", "router"],
  })
}

export function getTrpcErrorReport({
  error,
  path,
  requestId,
  router,
  type,
}: TrpcErrorDetails) {
  return buildErrorReport(error, {
    operation: path,
    requestId: getSafeObservabilityRequestId(requestId),
    runtime: "api",
    source: "trpc",
    tags: {
      procedure_type: type,
      router,
    },
  })
}

export function shouldCaptureTrpcError(error: TRPCError) {
  return getTrpcErrorReport({
    error,
    router: "app",
    type: "unknown",
  }).classified.reportable
}

export function getApiErrorReport(
  error: unknown,
  request: { method: string; requestId?: string }
) {
  return buildErrorReport(error, {
    requestId: getSafeObservabilityRequestId(request.requestId),
    runtime: "api",
    source: "hono",
    tags: { method: request.method },
  })
}

export function getApiNotificationErrorReport(error: unknown) {
  return buildErrorReport(error, {
    operation: "notifications.email.send",
    runtime: "api",
    source: "notification",
  })
}

export function getApiErrorContext(request: {
  method: string
  requestId?: string
}) {
  return getApiErrorReport(new Error("API request failed"), request)
    .captureContext
}
