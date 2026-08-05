import { initializeMarketingSentry } from "@/lib/sentry"

initializeMarketingSentry({
  dsn: process.env.SENTRY_DSN_MARKETING,
  environment: process.env.SENTRY_ENVIRONMENT_MARKETING,
  release: process.env.SENTRY_RELEASE_MARKETING,
})
