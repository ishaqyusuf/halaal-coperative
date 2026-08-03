"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export default function TrustSettingsError({
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
      description="Pilot-facing posture for legal readiness, exports, monitoring, feature requests, reliability, and safe error handling."
      eyebrow="Settings"
      title="Trust readiness"
    >
      <WorkspaceEmptyState
        body="The trust readiness evidence could not be loaded. No trust profile settings were changed."
        title="Something went wrong."
      />
    </WorkspacePageShell>
  )
}
