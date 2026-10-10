import {
  buildErrorReport,
  isObservabilityEnabled,
  sanitizeSentryEvent,
} from "@halaalvest/observability"

export type MobileErrorSource =
  | "mobile.error_boundary"
  | "mobile.auth.qa_access"
  | "mobile.auth.sign_in"
  | "mobile.mutation_cache"
  | "mobile.query_cache"
  | "mobile.contribution_operations"
  | "mobile.charge_operations"
  | "mobile.financing_operations"
  | "mobile.repayment_operations"
  | "mobile.procurement_operations"
  | "mobile.food_purchase_operations"
  | "mobile.project_financing_operations"
  | "mobile.notifications.permission_read"
  | "mobile.notifications.permission_request"
  | "mobile.notifications.registration"
  | "mobile.share_profit_governance"
  | "mobile.smoke_test"

export function isMobileSentryEnabled(input: {
  appVariant?: string
  deploymentEnvironment?: string
  dsn?: string
  explicitlyEnabled?: string
  nodeEnvironment?: string
}) {
  return input.appVariant === "production" &&
    input.explicitlyEnabled === "true" && isObservabilityEnabled(input)
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
