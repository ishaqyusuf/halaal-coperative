"use client"

import { SettingsError } from "@/components/workspace-settings/settings-error"

export default function RoleSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SettingsError body="No roles were changed." reset={reset} />
}
