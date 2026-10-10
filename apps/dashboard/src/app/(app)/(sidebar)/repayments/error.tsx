"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { WorkspacePageShell } from "@/components/dashboard"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function RepaymentsError({
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

  return (
    <WorkspacePageShell
      description="Repayment servicing could not be loaded. No financial records were changed."
      eyebrow="Repayments"
      title="Repayment workspace unavailable"
    >
      <section className="space-y-4 border-y border-border py-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Retry the repayment lookup or return to the dashboard.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Support reference: {publicError.referenceId}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-11 md:h-9" onClick={reset} type="button">
            Try again
          </Button>
          <Link
            className={buttonVariants({
              className: "h-11 md:h-9",
              variant: "outline",
            })}
            href="/"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </WorkspacePageShell>
  )
}
