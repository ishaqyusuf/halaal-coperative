"use client"

import { getErrorPresentation } from "@halaalvest/errors"
import { Button } from "@halaalvest/ui/components/button"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const publicError = useDashboardErrorReceipt(
    error,
    "dashboard.error_boundary"
  )
  const presentation = getErrorPresentation(publicError)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Recovery needed
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-normal text-foreground">
          {presentation.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {presentation.description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {presentation.reference}
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
