import * as Sentry from "@sentry/react-native"
import Constants from "expo-constants"
import * as Updates from "expo-updates"

import {
  getMobileErrorReport,
  isMobileSentryEnabled,
  type MobileErrorSource,
  sanitizeMobileSentryEvent,
} from "./sentry-policy"

const capturedErrors = new WeakSet<object>()
let enabled = false
let smokeTestSent = false

function getRuntimeTags() {
  const appVariant = Constants.expoConfig?.extra?.appVariant
  return {
    ...(typeof appVariant === "string" ? { app_variant: appVariant } : {}),
    expo_is_embedded_update: String(Updates.isEmbeddedLaunch),
    ...(Updates.runtimeVersion
      ? { expo_runtime_version: Updates.runtimeVersion }
      : {}),
    ...(Updates.updateId ? { expo_update_id: Updates.updateId } : {}),
  }
}

export function initializeMobileSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE
  const environment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT_MOBILE
  enabled = isMobileSentryEnabled({
    deploymentEnvironment: environment,
    dsn,
    explicitlyEnabled: process.env.EXPO_PUBLIC_SENTRY_ENABLED_MOBILE,
    nodeEnvironment: process.env.NODE_ENV,
  })
  if (!enabled) return false

  Sentry.init({
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeMobileSentryEvent(event) as unknown as typeof event,
    beforeSendTransaction: () => null,
    dsn,
    enableAutoSessionTracking: false,
    enableLogs: false,
    enableNative: false,
    enabled,
    environment,
    integrations: (defaults) =>
      defaults.filter(
        (integration) =>
          ![
            "Breadcrumbs",
            "BrowserSession",
            "BrowserTracing",
            "Feedback",
            "HttpClient",
            "Replay",
            "ReactNativeTracing",
          ].includes(integration.name)
      ),
    maxBreadcrumbs: 0,
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE_MOBILE,
    sendClientReports: false,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
  Sentry.setTags(getRuntimeTags())
  return true
}

export function captureMobileError(error: unknown, source: MobileErrorSource) {
  if (!enabled) return undefined
  if (typeof error === "object" && error !== null) {
    if (capturedErrors.has(error)) return undefined
    capturedErrors.add(error)
  }
  const report = getMobileErrorReport(error, source)
  if (!report.classified.reportable) return undefined
  return Sentry.captureException(report.reportableError, report.captureContext)
}

export function runMobileObservabilitySmokeTest() {
  if (
    smokeTestSent ||
    process.env.EXPO_PUBLIC_SENTRY_SMOKE_TEST_MOBILE !== "true"
  ) {
    return
  }
  smokeTestSent = true
  captureMobileError(new Error("Observability smoke test"), "mobile.smoke_test")
}
