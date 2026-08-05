import {
  buildErrorReport,
  isObservabilityEnabled,
  sanitizeSentryEvent,
} from "@halaalvest/observability"

export type MobileErrorSource =
  | "mobile.error_boundary"
  | "mobile.mutation_cache"
  | "mobile.query_cache"
  | "mobile.smoke_test"

export function isMobileSentryEnabled(input: {
  deploymentEnvironment?: string
  dsn?: string
  explicitlyEnabled?: string
  nodeEnvironment?: string
}) {
  return input.explicitlyEnabled === "true" && isObservabilityEnabled(input)
}

export function sanitizeMobileSentryEvent(event: unknown) {
  return sanitizeSentryEvent(event, {
    allowedTagKeys: [
      "app_variant",
      "expo_is_embedded_update",
      "expo_runtime_version",
      "expo_update_id",
    ],
  })
}

export function getMobileErrorReport(
  error: unknown,
  source: MobileErrorSource
) {
  return buildErrorReport(error, {
    runtime: "mobile",
    source,
  })
}
