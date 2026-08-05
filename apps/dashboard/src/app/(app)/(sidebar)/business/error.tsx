"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function BusinessError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useDashboardErrorReceipt(error, "dashboard.business_error_boundary")

  return (
    <WorkspacePageShell
      description="Business capital and profit evidence could not be loaded. No cooperative records were changed."
      eyebrow="Finance"
      title="Business workspace unavailable"
    >
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Retry the business lookup or return to the dashboard."
          eyebrow="Business"
          title="Something went wrong"
        />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
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
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
