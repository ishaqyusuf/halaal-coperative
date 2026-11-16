"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const publicError = useDashboardErrorReceipt(
    error,
    "dashboard.reports_error_boundary"
  )

  return (
    <div className="grid max-w-xl gap-4 border-y border-border py-8">
      <h2 className="text-xl font-semibold">This page could not load</h2>
      <p className="text-base text-muted-foreground">
        Nothing was changed. Please try again.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="touch"
          className="text-base"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
        <Link
          className={buttonVariants({
            className: "text-base",
            variant: "outline",
            size: "touch",
          })}
          href="/"
        >
          Go to Home
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Reference for support: {publicError.referenceId}
      </p>
    </div>
  )
}
