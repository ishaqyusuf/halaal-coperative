"use client"

import { SettingsError } from "@/components/workspace-settings/settings-error"

export default function OperationProfileSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <SettingsError body="No services were changed." reset={reset} />
}
