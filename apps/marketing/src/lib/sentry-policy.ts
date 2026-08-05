import {
  buildErrorReport,
  isObservabilityEnabled,
  sanitizeSentryEvent,
} from "@halaalvest/observability"
import { createErrorReferenceFromDigest } from "@halaalvest/errors"

export type MarketingErrorSource =
  | "marketing.error_boundary"
  | "marketing.provider"
  | "marketing.request"
  | "marketing.route"

export function isMarketingSentryEnabled(input: {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}) {
  return isObservabilityEnabled(input)
}

export function sanitizeMarketingSentryEvent(event: unknown) {
  return sanitizeSentryEvent(event, {
    allowedTagKeys: ["method", "provider"],
  })
}

export function getMarketingErrorReport(
  error: unknown,
  source: MarketingErrorSource,
  tags?: { method?: string; provider?: string }
) {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest ?? "")
      : undefined
  return buildErrorReport(error, {
    referenceId: createErrorReferenceFromDigest(digest),
    runtime: "marketing",
    source,
    tags,
  })
}

export function isServerCapturedMarketingError(
  error: Error & { digest?: string }
) {
  return Boolean(error.digest)
}
