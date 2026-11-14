"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ScrollableContent, WorkspaceEmptyState } from "@/components/dashboard"
import { importMenuItems } from "@/components/imports-settings-view"
import { SecondaryMenu } from "@/components/secondary-menu"

export default function ImportsSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={importMenuItems} />
        <WorkspaceEmptyState
          body="This page could not load. No import data was changed."
          title="Something went wrong."
        />
        <Button
          className="h-12 w-full text-base sm:w-auto"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
      </div>
    </ScrollableContent>
  )
}
