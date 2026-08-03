"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export default function MemberSignupLinksError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <WorkspacePageShell
      actions={
        <Button className="h-11 w-full md:h-10 md:w-auto" onClick={reset}>
          Try again
        </Button>
      }
      description="Control who can start member signup and manage staff-issued signup links."
      eyebrow="Membership"
      title="Member signup links"
    >
      <WorkspaceEmptyState
        body="The signup-link workspace could not be loaded. No access mode or signup link was changed."
        title="Something went wrong."
      />
    </WorkspacePageShell>
  )
}
