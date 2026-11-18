import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  projectBootstrapPresentation,
  type BootstrapScreenMode,
} from "@/features/bootstrap/model/bootstrap-presentation"
import { useColors } from "@/hooks/use-color"
import { SPLASH_LOGO, SPLASH_LOGO_SIZE } from "@/lib/splash-logo"
import { useEffect } from "react"
import { Image, useWindowDimensions, View } from "react-native"
import Animated, {
  FadeIn,
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
  const chip = mode === "loading" ? null : presentation.chip

  if (!chip) return <BootstrapSplash presentation={presentation} />

  return (
    <View
      className="flex-1 bg-background"
      testID="bootstrap-error"
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
          <View
            className={
              chip.tone === "danger"
                ? "size-[44px] items-center justify-center rounded-[14px] bg-tint-danger"
                : "size-[44px] items-center justify-center rounded-[14px] bg-tint-warm"
            }
          >
            <Icon
              className={
                chip.tone === "danger"
                  ? "size-[22px] text-tint-danger-foreground"
                  : "size-[22px] text-tint-warm-foreground"
              }
              name={chip.icon}
            />
          </View>
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
          {onRetry ? (
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
          ) : null}
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

/**
 * Loading splash (01 Calm title) that continues the native launch screen: the
 * same tile (SPLASH_LOGO, 64pt) at the exact screen centre on the same
 * canvas colour, so the hand-off has no jump. The title, copy, dots and note
 * fade in around it.
 */
function BootstrapSplash({
  presentation,
}: {
  presentation: ReturnType<typeof projectBootstrapPresentation>
}) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const reduceMotion = useReducedMotion()
  const fadeIn = reduceMotion ? undefined : FadeIn.duration(280).delay(80)
  const textWidth = Math.min(width - 56, 340)
  return (
    <View className="flex-1 bg-background" testID="bootstrap-loading">
      <OverlayStatusBar />
      {/* Style-only: absolute centring that matches the native launch image. */}
      <View
        style={{
          alignItems: "center",
          bottom: 0,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      >
        <View style={{ height: SPLASH_LOGO_SIZE, width: SPLASH_LOGO_SIZE }}>
          <Image
            accessibilityIgnoresInvertColors
            accessible={false}
            fadeDuration={0}
            source={SPLASH_LOGO}
            style={{ height: SPLASH_LOGO_SIZE, width: SPLASH_LOGO_SIZE }}
          />
          <Animated.View
            entering={fadeIn}
            style={{
              alignItems: "center",
              gap: 12,
              left: (SPLASH_LOGO_SIZE - textWidth) / 2,
              position: "absolute",
              top: SPLASH_LOGO_SIZE + 18,
              width: textWidth,
            }}
          >
            <Text
              accessibilityRole="header"
              className="text-center"
              variant="screenTitle"
            >
              {presentation.title}
            </Text>
            <Text
              className="text-center text-foreground-soft"
              variant="body"
            >
              {presentation.description}
            </Text>
            <ProgressDots />
          </Animated.View>
        </View>
      </View>
      <Animated.View
        entering={fadeIn}
        style={{
          bottom: Math.max(insets.bottom, 16) + 14,
          left: 28,
          position: "absolute",
          right: 28,
        }}
      >
        <View className="flex-row items-start gap-[10px] border-t border-border pt-[16px]">
          <Icon className="size-sm text-success" name="ShieldCheck" />
          <Text className="flex-1 text-muted-foreground" variant="small">
            {presentation.note}
          </Text>
        </View>
      </Animated.View>
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
