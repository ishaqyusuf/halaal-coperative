"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  SettingsEmpty,
  SettingsPage,
} from "@/components/workspace-settings/settings-page"

/** The route error state for a workspace settings page. */
export function SettingsError({
  body,
  reset,
}: {
  /** Says what was not changed, for example "No roles were changed." */
  body: string
  reset: () => void
}) {
  return (
    <SettingsPage
      action={
        <Button
          size="touch"
          className="w-full text-base sm:w-auto"
          onClick={reset}
          type="button"
        >
          Try again
        </Button>
      }
    >
      <SettingsEmpty body={body} title="This page didn't load." />
    </SettingsPage>
  )
}
