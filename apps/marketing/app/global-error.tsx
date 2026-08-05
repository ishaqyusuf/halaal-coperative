"use client"

import { getErrorPresentation } from "@halaalvest/errors"
import { useEffect, useMemo } from "react"
import { captureMarketingError } from "@/lib/sentry"
import {
  getMarketingErrorReport,
  isServerCapturedMarketingError,
} from "@/lib/sentry-policy"

export default function MarketingGlobalError({
  error,
}: {
  error: Error & { digest?: string }
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
    <html lang="en">
      <body>
        <main
          style={{
            fontFamily: "sans-serif",
            margin: "15vh auto",
            maxWidth: 520,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1>{presentation.title}</h1>
          <p>{presentation.description}</p>
          <p style={{ fontSize: 12 }}>{presentation.reference}</p>
        </main>
      </body>
    </html>
  )
}
