"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function DashboardHomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const publicError = useDashboardErrorReceipt(
    error,
    "dashboard.home_error_boundary"
  )

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">
          Dashboard overview
        </p>
        {/* Inside the shell: the top bar is the page's only <h1>. */}
        <h2 className="mt-3 text-xl font-semibold text-foreground">
          The overview could not be loaded
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          No workspace records were changed. Retry the overview request to
          continue.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Support reference: {publicError.referenceId}
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </section>
    </div>
  )
}
