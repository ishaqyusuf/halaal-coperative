import { GateHero, GateHeroSurface, GateMark } from "@/components/app/gate-hero"
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  projectBootstrapPresentation,
  type BootstrapScreenMode,
} from "@/features/bootstrap/model/bootstrap-presentation"
import { useColors } from "@/hooks/use-color"
import { resolveDockedFooterInset } from "@/lib/docked-footer-inset"
import { useEffect } from "react"
import { Platform, ScrollView, View } from "react-native"
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
 * Splash and bootstrap gate (T03, 02 Brand hero). Loading is the full-bleed
 * brand gradient continuing the native splash; a failed verification or an
 * offline start shows the gate hero with a docked Try again. It renders above
 * the navigator (root runtime gate), so it owns an overlay status bar.
 */
export function BootstrapScreen({
  mode = "loading",
  onRetry,
  retrying = false,
}: BootstrapScreenProps) {
  const presentation = projectBootstrapPresentation({ mode, retrying })
  if (mode === "loading" || !presentation.chip) {
    return <BootstrapSplash presentation={presentation} />
  }
  return (
    <BootstrapError
      chip={presentation.chip}
      onRetry={onRetry}
      presentation={presentation}
      retrying={retrying}
    />
  )
}

type Presentation = ReturnType<typeof projectBootstrapPresentation>

function BootstrapSplash({ presentation }: { presentation: Presentation }) {
  return (
    <View className="flex-1" testID="bootstrap-loading">
      <OverlayStatusBar tone="hero" />
      <GateHeroSurface fill>
        <View className="flex-1 items-center justify-center gap-[14px] px-[12px]">
          <GateMark identity={{ kind: "brand" }} size={72} />
          <Text
            accessibilityRole="header"
            className="text-center text-hero-foreground"
            variant="hero"
          >
            {presentation.title}
          </Text>
          <Text
            className="max-w-[300px] text-center text-hero-foreground/80"
            variant="body"
          >
            {presentation.description}
          </Text>
          <ProgressDots />
        </View>
        <View className="flex-row items-start gap-[10px]">
          <Icon className="size-sm text-hero-foreground/80" name="ShieldCheck" />
          <Text className="flex-1 text-hero-foreground/80" variant="small">
            {presentation.note}
          </Text>
        </View>
      </GateHeroSurface>
    </View>
  )
}

/** Three dots; the first pulses wide (off under reduce motion). */
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
    backgroundColor: colors.heroForeground,
    borderRadius: 3,
    height: 6,
    opacity: 0.4,
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
        style={[
          { backgroundColor: colors.heroForeground, borderRadius: 3, height: 6 },
          lead,
        ]}
      />
      <View style={dot} />
      <View style={dot} />
    </View>
  )
}

function BootstrapError({
  chip,
  onRetry,
  presentation,
  retrying,
}: {
  chip: NonNullable<Presentation["chip"]>
  onRetry?: () => void
  presentation: Presentation
  retrying: boolean
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View className="flex-1 bg-background" testID="bootstrap-error">
      <OverlayStatusBar tone="hero" />
      <ScrollView
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
        contentInsetAdjustmentBehavior="never"
      >
        <GateHero
          chip={chip}
          identity={{ kind: "brand" }}
          minHeightRatio={0.4}
          title={presentation.title}
        />
        <View className="gap-[14px] px-[18px] pt-[22px]">
          <Text className="text-foreground-soft" variant="body">
            {presentation.description}
          </Text>
          <View className="flex-row items-start gap-[10px]">
            <Icon className="size-sm text-success" name="ShieldCheck" />
            <Text className="flex-1 text-muted-foreground" variant="small">
              {presentation.note}
            </Text>
          </View>
        </View>
      </ScrollView>
      {onRetry ? (
        <View
          style={{
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: resolveDockedFooterInset(insets.bottom, Platform.OS),
            paddingHorizontal: 18,
            paddingTop: 12,
          }}
        >
          <Button
            accessibilityLabel={presentation.actionLabel ?? undefined}
            loading={retrying}
            onPress={onRetry}
          >
            <Icon className="size-base text-primary-foreground" name="RefreshCw" />
            <Text accessibilityLiveRegion="polite">
              {presentation.actionLabel}
            </Text>
          </Button>
        </View>
      ) : null}
    </View>
  )
}
