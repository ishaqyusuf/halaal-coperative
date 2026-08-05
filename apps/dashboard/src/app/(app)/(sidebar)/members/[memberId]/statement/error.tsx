"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function MemberStatementError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useDashboardErrorReceipt(error, "dashboard.member_statement_error_boundary")

  return (
    <WorkspacePageShell
      description="The member statement could not be loaded. No cooperative records were changed."
      eyebrow="Members"
      title="Member statement unavailable"
    >
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Retry the statement lookup or return to the member registry."
          eyebrow="Member statement"
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
            href="/members"
          >
            Back to member registry
          </Link>
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
