"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export default function OperationProfileSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <WorkspacePageShell
      actions={
        <Button className="h-10 w-full sm:w-auto" onClick={reset} type="button">
          Try again
        </Button>
      }
      description="Choose which cooperative services are offered and how members can access them."
      eyebrow="Settings"
      title="Operation profile"
    >
      <WorkspaceEmptyState
        body="The operation profile could not be loaded. No service access settings were changed."
        title="Something went wrong."
      />
    </WorkspacePageShell>
  )
}
