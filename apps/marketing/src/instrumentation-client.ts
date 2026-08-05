import { initializeMarketingSentry } from "@/lib/sentry"

initializeMarketingSentry({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_MARKETING,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT_MARKETING,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE_MARKETING,
})
