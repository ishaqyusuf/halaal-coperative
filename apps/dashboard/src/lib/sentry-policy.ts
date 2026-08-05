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

export function isDashboardSentryEnabled(input: {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}) {
  return isObservabilityEnabled(input)
}

export function sanitizeDashboardSentryEvent(event: unknown) {
  return sanitizeSentryEvent(event, { allowedTagKeys: ["method"] })
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
