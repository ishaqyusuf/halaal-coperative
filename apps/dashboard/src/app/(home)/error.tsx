"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useEffect } from "react"

export default function DashboardHomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void fetch("/api/error-report", {
      body: JSON.stringify({
        digest: error.digest,
        message: error.message,
        path: window.location.pathname,
        source: "dashboard.home_error_boundary",
        stack: error.stack,
      }),
      headers: {
        "content-type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined)
  }, [error.digest, error.message, error.stack])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Dashboard overview
        </p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">
          The overview could not be loaded
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          No workspace records were changed. Retry the overview request to
          continue.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </section>
    </main>
  )
}
