"use client"

import { SettingsError } from "@/components/workspace-settings/settings-error"

export default function ProfileSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SettingsError body="Nothing was changed." reset={reset} />
}
