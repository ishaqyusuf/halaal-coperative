import { initializeDashboardSentry } from "@/lib/sentry"

initializeDashboardSentry({
  dsn: process.env.SENTRY_DSN_DASHBOARD,
  environment: process.env.SENTRY_ENVIRONMENT_DASHBOARD,
  release: process.env.SENTRY_RELEASE_DASHBOARD,
})
