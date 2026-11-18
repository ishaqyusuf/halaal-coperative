import { StatusBanner } from "@/components/ui/status-banner"
import { type AuthErrorPresentation } from "@/features/auth/model/auth-errors"

/** One banner above the fields: connection problems in warm with Retry. */
export function AuthErrorBanner({
  error,
  onRetry,
  retrying,
}: {
  error: AuthErrorPresentation | null
  onRetry?: () => void
  retrying?: boolean
}) {
  if (!error) return null
  const connection = error.kind === "offline" || error.kind === "timeout"
  return (
    <StatusBanner
      kind={connection ? "offline" : "error"}
      onRetry={error.retryable ? onRetry : undefined}
      retrying={retrying}
      title={error.message}
    />
  )
}
