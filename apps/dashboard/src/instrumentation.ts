import type { Instrumentation } from "next"
import { applyHalaalvestSharedEnv } from "@halaalvest/utils/shared-env"

import { captureDashboardError } from "@/lib/sentry"

export async function register() {
  applyHalaalvestSharedEnv()
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request
) => {
  captureDashboardError(error, "dashboard.request", {
    method: request.method,
  })
}
