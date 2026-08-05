"use client"

import { toPublicError } from "@halaalvest/errors"
import { useEffect, useMemo } from "react"
import type { DashboardErrorSource } from "./error-reporting"

export function useDashboardErrorReceipt(
  error: Error,
  source: DashboardErrorSource
) {
  const publicError = useMemo(() => toPublicError(error), [error])

  useEffect(() => {
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
  }, [publicError.code, publicError.referenceId, source])

  return publicError
}
