"use client"

import { toPublicError } from "@halaalvest/errors"
import { useEffect, useMemo } from "react"
import type { DashboardErrorSource } from "./error-reporting"
import { captureDashboardError } from "./sentry"
import {
  getDashboardErrorReport,
  isServerCapturedBoundaryError,
} from "./sentry-policy"

export function useDashboardErrorReceipt(
  error: Error,
  source: DashboardErrorSource
) {
  const classifiedError = useMemo(
    () =>
      getDashboardErrorReport(error, "dashboard.error_boundary").classified,
    [error]
  )
  const publicError = useMemo(
    () => toPublicError(classifiedError),
    [classifiedError]
  )

  useEffect(() => {
    if (!isServerCapturedBoundaryError(error)) {
      captureDashboardError(classifiedError, "dashboard.error_boundary")
    }
    void fetch("/api/error-report", {
      body: JSON.stringify({
        code: publicError.code,
        referenceId: publicError.referenceId,
        source,
      }),
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined)
  }, [classifiedError, error, publicError.code, publicError.referenceId, source])

  return publicError
}
