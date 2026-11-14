"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspacePageShell } from "@/components/dashboard"
import { useDashboardErrorReceipt } from "@/lib/use-error-receipt"

export default function BusinessError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const publicError = useDashboardErrorReceipt(
    error,
    "dashboard.business_error_boundary"
  )

  return (
    <WorkspacePageShell description="" eyebrow="Business" title="Business">
      <div className="grid gap-3 border-y border-border py-10 text-center">
        <p className="text-lg font-semibold">This page could not be loaded.</p>
        <p className="text-base text-muted-foreground">
          Nothing was changed. Reference: {publicError.referenceId}
        </p>
        <Button className="mx-auto h-11 text-base" onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </WorkspacePageShell>
  )
}
