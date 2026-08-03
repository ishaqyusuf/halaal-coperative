"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export default function ProfileSettingsError({
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
      description="Core cooperative identity and onboarding profile details persisted during workspace setup."
      eyebrow="Settings"
      title="Cooperative profile"
    >
      <WorkspaceEmptyState
        body="The cooperative profile could not be loaded. No profile settings were changed."
        title="Something went wrong."
      />
    </WorkspacePageShell>
  )
}
