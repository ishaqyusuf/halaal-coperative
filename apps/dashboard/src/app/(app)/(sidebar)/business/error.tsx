"use client"

import { useEffect } from "react"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  WorkspacePageShell,
} from "@/components/dashboard"

export default function BusinessError({
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
        source: "dashboard.business_error_boundary",
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
