"use client"

import { useEffect } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"

export default function ReportsError({
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
        source: "dashboard.reports_error_boundary",
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
