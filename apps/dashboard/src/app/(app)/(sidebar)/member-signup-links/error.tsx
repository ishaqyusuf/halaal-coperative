"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { memberSignupLinksPageCopy } from "@/lib/signup-links/member-signup-links"

export default function MemberSignupLinksError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <WorkspacePageShell
      actions={
        <Button
          size="touch"
          className="w-full md:h-10 md:w-auto"
          onClick={reset}
        >
          Try again
        </Button>
      }
      {...memberSignupLinksPageCopy}
    >
      <WorkspaceEmptyState
        body="Nothing was changed. Try again."
        title="This page did not load"
      />
    </WorkspacePageShell>
  )
}
