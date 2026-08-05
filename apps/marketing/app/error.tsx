"use client"

import { getErrorPresentation } from "@halaalvest/errors"
import { useEffect, useMemo } from "react"
import { captureMarketingError } from "@/lib/sentry"
import {
  getMarketingErrorReport,
  isServerCapturedMarketingError,
} from "@/lib/sentry-policy"

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const classifiedError = useMemo(
    () => getMarketingErrorReport(error, "marketing.error_boundary").classified,
    [error]
  )
  const presentation = useMemo(
    () => getErrorPresentation(classifiedError),
    [classifiedError]
  )

  useEffect(() => {
    if (!isServerCapturedMarketingError(error)) {
      captureMarketingError(classifiedError, "marketing.error_boundary")
    }
  }, [classifiedError, error])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">{presentation.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {presentation.description}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {presentation.reference}
      </p>
      <button
        className="mt-6 rounded-md border px-4 py-2 text-sm font-medium"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </main>
  )
}
