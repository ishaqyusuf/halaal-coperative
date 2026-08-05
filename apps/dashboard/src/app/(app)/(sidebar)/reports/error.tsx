"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useDashboardErrorReceipt(error, "dashboard.reports_error_boundary")

  return (
    <WorkspacePageShell
      description="The reporting workspace could not be loaded. No cooperative records were changed."
      eyebrow="Reports"
      title="Reporting unavailable"
    >
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Retry the report lookup or return to the dashboard. Existing audit evidence and exports are unchanged."
          eyebrow="Reports"
          title="Something went wrong"
        />
        <div className="mt-5 flex flex-col gap-2 md:flex-row">
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
