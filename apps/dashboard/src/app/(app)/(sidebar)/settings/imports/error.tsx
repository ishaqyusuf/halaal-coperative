"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  ScrollableContent,
  WorkspaceEmptyState,
} from "@/components/dashboard"
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Import settings
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              Imports and migrations
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Structured member, historical-record, and migration imports.
            </p>
          </div>
          <Button
            className="h-11 w-full md:h-9 md:w-auto"
            onClick={reset}
            type="button"
          >
            Try again
          </Button>
        </div>
        <WorkspaceEmptyState
          body="The import settings and batch readiness could not be loaded. No import data was changed."
          title="Something went wrong."
        />
      </div>
    </ScrollableContent>
  )
}
