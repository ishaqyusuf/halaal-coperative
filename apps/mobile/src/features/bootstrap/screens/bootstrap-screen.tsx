import { GateMark } from "@/components/app/gate-hero"
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Elevated } from "@/components/ui/list-card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  projectBootstrapPresentation,
  type BootstrapScreenMode,
} from "@/features/bootstrap/model/bootstrap-presentation"
import { useColors } from "@/hooks/use-color"
import { useEffect } from "react"
import { View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type BootstrapScreenProps = {
  mode?: BootstrapScreenMode
  onRetry?: () => void
  retrying?: boolean
}

/**
 * Splash and bootstrap gate (T03, owner pick 01 Calm title). Loading is the
 * canvas with the HalaalVest tile, title and progress dots; a failed
 * verification or an offline start shows a small tinted tile, the message and
 * an inline Try again. A shield note sits at the foot. It renders above the
 * navigator (root runtime gate), so it owns an overlay status bar.
 */
export function BootstrapScreen({
  mode = "loading",
  onRetry,
  retrying = false,
}: BootstrapScreenProps) {
  const presentation = projectBootstrapPresentation({ mode, retrying })
  const insets = useSafeAreaInsets()
  const failed = mode !== "loading" && presentation.chip

  return (
    <View
      className="flex-1 bg-background"
      testID={failed ? "bootstrap-error" : "bootstrap-loading"}
    >
      <OverlayStatusBar />
      {/* Style-only: padding follows the runtime safe-area insets. */}
      <View
        style={{
          flex: 1,
          paddingBottom: Math.max(insets.bottom, 16) + 14,
          paddingHorizontal: 28,
          paddingTop: insets.top + 24,
        }}
      >
        <View className="flex-1 items-center justify-center gap-[12px]">
          {failed && presentation.chip ? (
            <View
              className={
                presentation.chip.tone === "danger"
                  ? "size-[44px] items-center justify-center rounded-[14px] bg-tint-danger"
                  : "size-[44px] items-center justify-center rounded-[14px] bg-tint-warm"
              }
            >
              <Icon
                className={
                  presentation.chip.tone === "danger"
                    ? "size-[22px] text-tint-danger-foreground"
                    : "size-[22px] text-tint-warm-foreground"
                }
                name={presentation.chip.icon}
              />
            </View>
          ) : (
            <Elevated className="rounded-[20px] bg-card" radius={20}>
              <View className="size-[64px] items-center justify-center">
                <GateMark identity={{ kind: "brand" }} size={44} />
              </View>
            </Elevated>
          )}
          <Text
            accessibilityRole="header"
            className="mt-[6px] max-w-[320px] text-center"
            variant="screenTitle"
          >
            {presentation.title}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            className="max-w-[320px] text-center text-foreground-soft"
            variant="body"
          >
            {presentation.description}
          </Text>
          {failed ? (
            onRetry ? (
              <View className="mt-[14px] w-full">
                <Button
                  accessibilityLabel={presentation.actionLabel ?? undefined}
                  loading={retrying}
                  onPress={onRetry}
                >
                  <Icon
                    className="size-base text-primary-foreground"
                    name="RefreshCw"
                  />
                  <Text>{presentation.actionLabel}</Text>
                </Button>
              </View>
            ) : null
          ) : (
            <ProgressDots />
          )}
        </View>
        <View className="flex-row items-start gap-[10px] border-t border-border pt-[16px]">
          <Icon className="size-sm text-success" name="ShieldCheck" />
          <Text className="flex-1 text-muted-foreground" variant="small">
            {presentation.note}
          </Text>
        </View>
      </View>
    </View>
  )
}

/** Three brand dots; the first pulses wide (off under reduce motion). */
function ProgressDots() {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const width = useSharedValue(22)
  useEffect(() => {
    if (reduceMotion) return
    width.set(withRepeat(withTiming(10, { duration: 700 }), -1, true))
  }, [reduceMotion, width])
  const lead = useAnimatedStyle(() => ({ width: width.get() }))
  const dot = {
    backgroundColor: colors.brand,
    borderRadius: 3,
    height: 6,
    opacity: 0.3,
    width: 6,
  }
  return (
    <View
      accessibilityLabel="Verifying workspace access"
      accessibilityRole="progressbar"
      accessible
      style={{ flexDirection: "row", gap: 6, marginTop: 8 }}
    >
      <Animated.View
        style={[{ backgroundColor: colors.brand, borderRadius: 3, height: 6 }, lead]}
      />
      <View style={dot} />
      <View style={dot} />
    </View>
  )
}
