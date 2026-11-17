import { isMobileDevelopmentBuild } from "@/dev/mobile-dev-session"
import {
  resolveBootstrapPreviewMode,
  type BootstrapScreenMode,
} from "@/features/bootstrap/model/bootstrap-presentation"
import { BootstrapScreen } from "@/features/bootstrap/screens/bootstrap-screen"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { StyleSheet, View } from "react-native"
import Animated, { FadeOut, useReducedMotion } from "react-native-reanimated"

export function MobileRuntimeGate({ children }: { children: React.ReactNode }) {
  const { retry, state } = useMobileRuntime()
  const reduceMotion = useReducedMotion()
  const previewMode = resolveBootstrapPreviewMode(
    process.env.EXPO_PUBLIC_MOBILE_BOOTSTRAP_PREVIEW,
    isMobileDevelopmentBuild
  )

  const booting =
    Boolean(previewMode) ||
    state.session === "cold" ||
    state.session === "hydrating" ||
    state.session === "fatal"

  const mode: BootstrapScreenMode =
    previewMode ??
    (state.session === "fatal"
      ? state.connectivity === "offline"
        ? "offline"
        : "fatal"
      : "loading")
  const isRetrying = state.recovery === "retrying"

  // The app mounts under the splash, and the splash fades out over it (T03:
  // fade, not a swap or slide, and never a blank page).
  return (
    <View className="flex-1">
      {booting ? null : children}
      {booting ? (
        <Animated.View
          exiting={reduceMotion ? undefined : FadeOut.duration(240)}
          style={StyleSheet.absoluteFill}
        >
          <BootstrapScreen
            mode={mode}
            onRetry={mode === "loading" ? undefined : () => void retry()}
            retrying={isRetrying}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}
