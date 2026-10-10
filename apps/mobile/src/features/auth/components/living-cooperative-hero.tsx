import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { LivingCooperativeMotif } from "@/features/auth/components/living-cooperative-motif"
import { type LivingCooperativePresentation } from "@/features/auth/model/living-cooperative-presentation"
import { type MobileProfile } from "@/lib/session-store"
import { cn } from "@/lib/utils"
import { Animated, Image, View } from "react-native"

const halaalvestLogo = require("../../../../assets/icons/app-icon.png")

export function LivingCooperativeHero({
  identityOpacity,
  largeTextLayout,
  presentation,
  profile,
}: {
  identityOpacity: Animated.Value
  largeTextLayout: boolean
  presentation: LivingCooperativePresentation
  profile: MobileProfile | null
}) {
  const tenantName = profile?.tenant.name ?? "HalaalVest"
  const logoUrl = profile?.tenant.branding.logoUrl
  const identityMark = profile?.tenant.branding.mark?.trim() || "H"

  return (
    <View
      className={cn(
        "bg-brand-surface relative overflow-hidden px-6 pt-5",
        largeTextLayout ? "min-h-[190px] pb-8" : "min-h-[370px] pb-16"
      )}
    >
      <LivingCooperativeMotif
        hideForLargeText={largeTextLayout}
        identityMark={identityMark}
      />

      <Animated.View style={{ opacity: identityOpacity }}>
        <View className="min-h-12 flex-row items-center gap-3">
          <View
            className={cn(
              "relative size-12 items-center justify-center overflow-visible rounded-2xl",
              profile ? "bg-brand-warm" : "bg-brand-surface-foreground"
            )}
          >
            <View className="size-full overflow-hidden rounded-2xl">
              {logoUrl ? (
                <Image
                  accessibilityLabel={`${tenantName} logo`}
                  className="size-full"
                  resizeMode="cover"
                  source={{ uri: logoUrl }}
                />
              ) : profile ? (
                <View className="size-full items-center justify-center">
                  <Text
                    className="text-brand-surface text-lg font-black"
                    maxFontSizeMultiplier={1}
                  >
                    {identityMark}
                  </Text>
                </View>
              ) : (
                <Image
                  accessible={false}
                  className="size-full"
                  resizeMode="cover"
                  source={halaalvestLogo}
                />
              )}
            </View>

            {profile ? (
              <View className="border-brand-surface bg-brand absolute -right-1 -bottom-1 size-5 items-center justify-center rounded-full border-2">
                <Icon
                  className="size-xs text-brand-foreground"
                  name="Check"
                  strokeWidth={2.6}
                />
              </View>
            ) : null}
          </View>

          <View className="min-w-0 flex-1">
            <Text
              accessibilityLiveRegion="polite"
              className="text-brand-surface-foreground text-lg leading-6 font-black tracking-[-0.45px]"
              maxFontSizeMultiplier={1.5}
              numberOfLines={largeTextLayout || profile ? 2 : 1}
            >
              {tenantName}
            </Text>
            {profile ? (
              <Text className="text-brand-surface-foreground/70 mt-0.5 text-xs font-semibold">
                Cooperative confirmed
              </Text>
            ) : null}
          </View>
        </View>

        {presentation.lead ? (
          <Text
            accessibilityLabel={presentation.accessibilityLabel}
            accessibilityRole="header"
            className={cn(
              "text-brand-surface-foreground max-w-[235px] font-black tracking-[-1.7px]",
              largeTextLayout
                ? "mt-8 text-[32px] leading-[34px]"
                : "mt-12 text-[38px] leading-[40px]"
            )}
            maxFontSizeMultiplier={1.4}
          >
            {presentation.lead}
            {presentation.accent ? (
              <Text
                className={cn(
                  "font-black tracking-[-1.7px] text-accent",
                  largeTextLayout
                    ? "text-[32px] leading-[34px]"
                    : "text-[38px] leading-[39px]"
                )}
                maxFontSizeMultiplier={1.4}
              >
                {` ${presentation.accent}`}
              </Text>
            ) : null}
          </Text>
        ) : null}
      </Animated.View>

      {largeTextLayout ? null : (
        <View
          accessible={false}
          className="absolute bottom-7 left-6 h-1 flex-row overflow-hidden rounded-full"
          importantForAccessibility="no"
          pointerEvents="none"
        >
          <View className="bg-brand-warm w-20" />
          <View className="bg-brand-vivid w-12" />
          <View className="bg-brand w-14" />
        </View>
      )}
    </View>
  )
}
