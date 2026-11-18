import {
  buildErrorReport,
  isObservabilityEnabled,
  sanitizeSentryEvent,
} from "@halaalvest/observability"
import { createErrorReferenceFromDigest } from "@halaalvest/errors"

export type DashboardErrorSource =
  | "dashboard.error_boundary"
  | "dashboard.global_error"
  | "dashboard.mutation_cache"
  | "dashboard.query_cache"
  | "dashboard.request"
  | "dashboard.trpc"

export function isDashboardSentryEnabled(input: {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}) {
  return isObservabilityEnabled(input)
}

export function sanitizeDashboardSentryEvent(event: unknown) {
  return sanitizeSentryEvent(event, {
    allowedTagKeys: ["method", "procedure_type"],
  })
}

export function getDashboardErrorReport(
  error: unknown,
  source: DashboardErrorSource,
  tags?: { method?: string }
) {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest ?? "")
      : undefined
  return buildErrorReport(error, {
    referenceId: createErrorReferenceFromDigest(digest),
    runtime: "dashboard",
    source,
    tags,
  })
}

export function isServerCapturedBoundaryError(
  error: Error & { digest?: string }
) {
  return Boolean(error.digest)
}

/**
 * A failure from the tRPC router the dashboard hosts at `/api/trpc` (the API
 * that web and mobile call). The procedure path is the operation; the request
 * ID matches the reference the client shows.
 */
export function getDashboardTrpcErrorReport(input: {
  error: unknown
  path?: string
  requestId?: string
  type: string
}) {
  return buildErrorReport(input.error, {
    operation: input.path,
    requestId: input.requestId,
    runtime: "dashboard",
    source: "dashboard.trpc",
    tags: { procedure_type: input.type },
  })
}
