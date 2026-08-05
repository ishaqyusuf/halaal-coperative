"use client"

import { getErrorPresentation } from "@halaalvest/errors"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  const presentation = getErrorPresentation(error)
  useDashboardErrorReceipt(error, "dashboard.global_error")

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
