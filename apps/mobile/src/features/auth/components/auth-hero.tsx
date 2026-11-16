import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { LivingCooperativeMotif } from "@/features/auth/components/living-cooperative-motif"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { type MobileProfile } from "@/lib/session-store"
import { cn } from "@/lib/utils"
import { type ReactNode } from "react"
import { Image, useWindowDimensions, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const halaalvestLogo = require("../../../../assets/icons/app-icon.png")

/** Below this window height the motif is dropped and the headline shrinks. */
const COMPACT_WINDOW_HEIGHT = 700

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Gradient hero edge to edge under the status bar (light icons), radius 28
 * at the bottom. Height scales with the window: 34% for sign-in, 30% for
 * recovery, clamped so small phones keep room for the fields.
 */
function HeroSurface({
  children,
  kind,
}: {
  children: ReactNode
  kind: "sign-in" | "recovery"
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const largeText = useLargeTextLayout()
  const minHeight =
    kind === "sign-in"
      ? clamp(height * 0.34, 204, 312)
      : clamp(height * 0.3, 190, 270)

  return (
    <View
      style={{
        backgroundColor: colors.heroMid,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        experimental_backgroundImage: `linear-gradient(165deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
        minHeight: largeText ? undefined : minHeight,
        overflow: "hidden",
        paddingBottom: 26,
        paddingHorizontal: 18,
        paddingTop: insets.top + 12,
      }}
    >
      <View className="flex-1 justify-between gap-[20px]">{children}</View>
    </View>
  )
}

function useCompactHero() {
  const { height } = useWindowDimensions()
  const largeText = useLargeTextLayout()
  return largeText || height < COMPACT_WINDOW_HEIGHT
}

/**
 * Sign-in hero: HalaalVest identity, then the cooperative confirmed by the
 * server (its mark with a check) for the short hand-off before the app opens.
 */
export function SignInHero({ profile }: { profile: MobileProfile | null }) {
  const compact = useCompactHero()
  const confirmed = Boolean(profile)
  const tenantName = profile?.tenant.name ?? "HalaalVest"
  const shortName =
    tenantName.replace(/\s+co-?operative$/i, "").trim() || tenantName
  const mark = profile?.tenant.branding.mark?.trim() || "H"

  return (
    <HeroSurface kind="sign-in">
      <View
        accessible={false}
        className="absolute -top-[72px] -right-[80px] size-[200px] rounded-full bg-hero-foreground/5"
        importantForAccessibility="no"
        pointerEvents="none"
      />
      {compact ? null : (
        <LivingCooperativeMotif confirmed={confirmed} identityMark={mark} />
      )}
      <View className="min-h-[48px] flex-row items-center gap-[12px]">
        <View
          className={cn(
            "size-[44px] items-center justify-center rounded-[14px]",
            confirmed ? "bg-brand-warm" : "bg-hero-foreground"
          )}
        >
          {confirmed ? (
            <Text className="text-hero-mark-foreground" maxFontSizeMultiplier={1} variant="section">
              {mark}
            </Text>
          ) : (
            <Image
              accessible={false}
              className="size-[34px]"
              resizeMode="contain"
              source={halaalvestLogo}
            />
          )}
          {confirmed ? (
            <View className="absolute -right-[4px] -bottom-[4px] size-[20px] items-center justify-center rounded-full border-2 border-hero-foreground bg-primary">
              <Icon className="size-xs text-primary-foreground" name="Check" />
            </View>
          ) : null}
        </View>
        <View accessibilityLiveRegion="polite" className="min-w-0 flex-1">
          <Text
            className="text-hero-foreground"
            numberOfLines={2}
            variant="section"
          >
            {tenantName}
          </Text>
          {confirmed ? (
            <Text className="text-hero-foreground/70" variant="caption">
              Cooperative confirmed
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        accessibilityRole="header"
        className={cn(
          "text-hero-foreground",
          compact && "text-[30px] leading-[34px]",
          confirmed ? "max-w-[320px]" : "max-w-[250px]"
        )}
        maxFontSizeMultiplier={1.4}
        variant="hero"
      >
        {confirmed ? "Welcome back to " : "Welcome back."}
        {confirmed ? (
          <Text className="text-hero-accent" variant="hero">
            {`${shortName}.`}
          </Text>
        ) : null}
      </Text>
    </HeroSurface>
  )
}

/** Recovery hero: round back button, three step bars and the step title. */
export function RecoveryHero({
  backLabel,
  onBack,
  step,
  title,
}: {
  backLabel: string
  onBack: () => void
  step: 1 | 2 | 3
  title: string
}) {
  return (
    <HeroSurface kind="recovery">
      <Pressable
        accessibilityLabel={backLabel}
        accessibilityRole="button"
        className="size-[44px] items-center justify-center rounded-full bg-hero-foreground/15"
        haptic
        hitSlop={4}
        onPress={onBack}
        testID="recovery-back"
      >
        <Icon className="size-md text-hero-foreground" name="ChevronLeft" />
      </Pressable>
      <View className="gap-[14px]">
        <View
          accessibilityLabel={`Step ${step} of 3`}
          accessibilityRole="progressbar"
          className="flex-row gap-[6px]"
        >
          {[1, 2, 3].map((index) => (
            <View
              className={cn(
                "h-[4px] w-[28px] rounded-full",
                index <= step ? "bg-hero-foreground" : "bg-hero-foreground/25"
              )}
              key={index}
            />
          ))}
        </View>
        <Text
          accessibilityRole="header"
          className="text-hero-foreground"
          maxFontSizeMultiplier={1.4}
          variant="screenTitle"
        >
          {title}
        </Text>
      </View>
    </HeroSurface>
  )
}
