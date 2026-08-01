"use client"

import { useEffect } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"

export default function MemberBackfillError({
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
        source: "dashboard.member_backfill_error_boundary",
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
    <WorkspacePageShell
      description="The member migration workflow could not be loaded. No migration records were changed."
      eyebrow="Member migration"
      title="Migration unavailable"
    >
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Retry the member migration lookup or return to the registry to choose another member."
          eyebrow="Member migration"
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
            href="/members"
          >
            Back to member registry
          </Link>
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
