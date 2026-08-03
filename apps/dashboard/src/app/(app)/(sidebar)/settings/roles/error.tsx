"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export default function RoleSettingsError({
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
      description="Staff provisioning, default-role visibility, and module permission guidance for cooperative operators."
      eyebrow="Settings"
      title="Workspace roles"
    >
      <WorkspaceEmptyState
        body="The workspace role directory could not be loaded. No role assignments were changed."
        title="Something went wrong."
      />
    </WorkspacePageShell>
  )
}
