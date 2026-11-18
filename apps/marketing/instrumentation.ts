import type { Instrumentation } from "next"
import { applyHalaalvestSharedEnv } from "@halaalvest/utils/shared-env"

import { captureMarketingError } from "@/lib/sentry"

// Next.js loads this file only beside the `app` directory (the app root here,
// not `src/`). Without it the linked HALAALVEST_* secrets never reach
// AUTH_SECRET / SIGNUP_TOKEN_SECRET and QA authorization fails.
export async function register() {
  applyHalaalvestSharedEnv()
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request
) => {
  captureMarketingError(error, "marketing.request", {
    method: request.method,
  })
}
