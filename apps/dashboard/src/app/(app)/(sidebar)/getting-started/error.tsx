"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export default function GettingStartedError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <WorkspacePageShell
      actions={
        <Button
          className="h-11 w-full md:h-10 md:w-auto"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
      }
      description="Set the cooperative's migration path and complete each finance gate before live records open."
      eyebrow="Initial migration"
      title="Getting started"
    >
      <WorkspaceEmptyState
        body="The migration setup could not be loaded. No cooperative finance or member records were changed."
        title="Something went wrong."
      />
    </WorkspacePageShell>
  )
}
