import { isMobileDevelopmentBuild } from "@/dev/mobile-dev-session"
import {
  resolveBootstrapPreviewMode,
  type BootstrapScreenMode,
} from "@/features/bootstrap/model/bootstrap-presentation"
import { BootstrapScreen } from "@/features/bootstrap/screens/bootstrap-screen"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"

export function MobileRuntimeGate({ children }: { children: React.ReactNode }) {
  const { retry, state } = useMobileRuntime()
  const previewMode = resolveBootstrapPreviewMode(
    process.env.EXPO_PUBLIC_MOBILE_BOOTSTRAP_PREVIEW,
    isMobileDevelopmentBuild
  )

  if (
    !previewMode &&
    state.session !== "cold" &&
    state.session !== "hydrating" &&
    state.session !== "fatal"
  ) {
    return children
  }

  const mode: BootstrapScreenMode =
    previewMode ?? (state.session === "fatal" ? "fatal" : "loading")
  const isRetrying = state.recovery === "retrying"

  return (
    <BootstrapScreen
      mode={mode}
      onRetry={mode === "fatal" ? () => void retry() : undefined}
      retrying={isRetrying}
    />
  )
}
