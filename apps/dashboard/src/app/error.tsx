"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useEffect } from "react"

export default function DashboardErrorBoundary({
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
        source: "dashboard.error_boundary",
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
          Recovery needed
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-normal text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The workspace could not complete this request. Try again, or contact
          support if it keeps happening.
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
