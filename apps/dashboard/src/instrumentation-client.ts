import { initializeDashboardSentry } from "@/lib/sentry"

initializeDashboardSentry({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_DASHBOARD,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT_DASHBOARD,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE_DASHBOARD,
})
