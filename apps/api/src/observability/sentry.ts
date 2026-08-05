import {
  buildErrorReport,
  isObservabilityEnabled,
} from "@halaalvest/observability"
import type { TRPCError } from "@trpc/server"

type ApiEvent = {
  request?: Record<string, unknown> & { method?: string }
  user?: unknown
}

type SentryEnvironmentInput = {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}

export function isSentryEnabled(input: SentryEnvironmentInput) {
  return isObservabilityEnabled(input)
}

export function sanitizeApiSentryEvent<TEvent extends ApiEvent>(event: TEvent) {
  const sanitizedEvent = { ...event, user: undefined }

  if (sanitizedEvent.request) {
    sanitizedEvent.request = sanitizedEvent.request.method
      ? { method: sanitizedEvent.request.method }
      : {}
  }

  return sanitizedEvent
}

export function shouldCaptureTrpcError(error: TRPCError) {
  return buildErrorReport(error, {
    runtime: "api",
    source: "trpc",
  }).classified.reportable
}

export function getApiErrorContext(request: {
  method: string
  requestId?: string
}) {
  return buildErrorReport(new Error("API request failed"), {
    requestId: request.requestId,
    runtime: "api",
    source: "hono",
    tags: { method: request.method },
  }).captureContext
}
