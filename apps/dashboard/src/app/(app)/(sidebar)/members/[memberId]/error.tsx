"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"

export default function MemberDetailError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <WorkspacePageShell
      description="The member workspace could not be loaded. No member information was changed."
      eyebrow="Members"
      title="Member details unavailable"
    >
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Retry the member lookup or return to the registry to choose another member."
          eyebrow="Member details"
          title="Something went wrong"
        />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} type="button">
            Try again
          </Button>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/members"
          >
            Back to member registry
          </Link>
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
