import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import type { MobileProfile } from "@/lib/session-store"
import { THEME } from "@/lib/theme"
import { type ReactNode } from "react"
import {
  ActivityIndicator,
  Image,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const halaalvestLogo = require("../../../assets/icons/app-icon.png")

/** Below this window height heroes drop their minimum height. */
const COMPACT_WINDOW_HEIGHT = 700

export type GateTone = "neutral" | "warm" | "danger" | "ok"

/**
 * Chip icon tints on the hero gradient (02 Brand hero, workshop 03). The hero
 * is dark in both themes, so the tints come from the dark palette.
 */
const CHIP_ICON_COLOR: Record<GateTone, string | undefined> = {
  danger: THEME.dark.tintDangerForeground,
  neutral: undefined,
  ok: THEME.dark.tintSuccessForeground,
  warm: THEME.dark.tintWarmForeground,
}

export type GateIdentity =
  | { kind: "brand" }
  | { kind: "cooperative"; mark: string; name: string; detail?: string }

/** The signed-in cooperative's mark and the user line, or HalaalVest. */
export function gateIdentityFor(
  profile: MobileProfile | null | undefined
): GateIdentity {
  if (!profile) return { kind: "brand" }
  const mark =
    profile.tenant.branding.mark?.trim() ||
    profile.tenant.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  return {
    detail: [profile.user.name, profile.member?.code].filter(Boolean).join(" · "),
    kind: "cooperative",
    mark,
    name: profile.tenant.name,
  }
}

/**
 * The gradient surface every gate draws under the status bar: edge to edge,
 * bottom radius 28, the top inset folded into its padding, with the two soft
 * circles of the 02 hero. `fill` makes it a full-screen splash.
 */
export function GateHeroSurface({
  children,
  fill = false,
  minHeightRatio,
}: {
  children: ReactNode
  fill?: boolean
  /** Share of the window height (e.g. 0.4) on regular phones. */
  minHeightRatio?: number
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const largeText = useLargeTextLayout()
  const compact = largeText || height < COMPACT_WINDOW_HEIGHT
  const minHeight =
    !fill && minHeightRatio && !compact ? height * minHeightRatio : undefined

  return (
    <View
      style={{
        backgroundColor: colors.heroMid,
        borderBottomLeftRadius: fill ? 0 : 28,
        borderBottomRightRadius: fill ? 0 : 28,
        experimental_backgroundImage: `linear-gradient(165deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
        flex: fill ? 1 : undefined,
        minHeight,
        overflow: "hidden",
        paddingBottom: fill ? Math.max(insets.bottom, 16) + 8 : 24,
        paddingHorizontal: 18,
        paddingTop: insets.top + 12,
      }}
    >
      <View
        accessible={false}
        className="absolute -top-[60px] -right-[70px] size-[220px] rounded-full bg-hero-foreground/5"
        importantForAccessibility="no"
        pointerEvents="none"
      />
      <View
        accessible={false}
        className="absolute top-[40px] -right-[24px] size-[120px] rounded-full bg-hero-foreground/5"
        importantForAccessibility="no"
        pointerEvents="none"
      />
      {/* flex-1 only when the surface has a height to share (fill or a
          minimum); otherwise a flex child would collapse to zero. */}
      <View
        className={
          fill || minHeight
            ? "flex-1 justify-between gap-[20px]"
            : "gap-[20px]"
        }
      >
        {children}
      </View>
    </View>
  )
}

/** HalaalVest logo tile, or the cooperative's warm mark. */
export function GateMark({
  identity,
  size = 44,
}: {
  identity: GateIdentity
  size?: 44 | 56 | 72
}) {
  const radius = size === 44 ? 14 : size === 56 ? 18 : 22
  const tile =
    size === 44
      ? "size-[44px] rounded-[14px]"
      : size === 56
        ? "size-[56px] rounded-[18px]"
        : "size-[72px] rounded-[22px]"
  if (identity.kind === "brand") {
    return (
      <View
        className={`${tile} items-center justify-center bg-hero-foreground`}
      >
        <Image
          accessible={false}
          resizeMode="contain"
          source={halaalvestLogo}
          style={{ borderRadius: radius / 2, height: size * 0.76, width: size * 0.76 }}
        />
      </View>
    )
  }
  return (
    <View className={`${tile} items-center justify-center bg-brand-warm`}>
      <Text
        className="text-hero-mark-foreground"
        maxFontSizeMultiplier={1}
        variant={size === 44 ? "section" : "title"}
      >
        {identity.mark}
      </Text>
    </View>
  )
}

/** Mark + cooperative (or HalaalVest) name and the signed-in user line. */
export function GateIdentityRow({ identity }: { identity: GateIdentity }) {
  return (
    <View className="min-h-[48px] flex-row items-center gap-[12px]">
      <GateMark identity={identity} />
      <View className="min-w-0 flex-1">
        <Text
          className="text-hero-foreground"
          numberOfLines={2}
          variant="section"
        >
          {identity.kind === "brand" ? "HalaalVest" : identity.name}
        </Text>
        {identity.kind === "cooperative" && identity.detail ? (
          <Text
            className="text-hero-foreground/75"
            numberOfLines={1}
            variant="caption"
          >
            {identity.detail}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/** Status chip on the hero: 30pt pill, tone shown by the icon tint. */
export function GateChip({
  busy = false,
  icon,
  label,
  tone = "neutral",
}: {
  busy?: boolean
  icon: string
  label: string
  tone?: GateTone
}) {
  const colors = useColors()
  const iconColor = CHIP_ICON_COLOR[tone] ?? colors.heroForeground
  return (
    <View className="h-[30px] flex-row items-center gap-[6px] self-start rounded-full bg-hero-foreground/15 px-[12px]">
      {busy ? (
        <ActivityIndicator color={colors.heroForeground} size="small" />
      ) : (
        <Icon className="size-sm" color={iconColor} name={icon} />
      )}
      <Text className="text-hero-foreground" variant="caption">
        {label}
      </Text>
    </View>
  )
}

/**
 * Gate hero (02 Brand hero): identity row at the top, then the status chip
 * and a 26/32 headline at the bottom. Used by the splash error, mobile access
 * and not-found gates inside DockedHeroScreen.
 */
export function GateHero({
  chip,
  identity,
  minHeightRatio,
  title,
}: {
  chip: { busy?: boolean; icon: string; label: string; tone?: GateTone }
  identity: GateIdentity
  minHeightRatio?: number
  title: string
}) {
  return (
    <GateHeroSurface minHeightRatio={minHeightRatio}>
      <GateIdentityRow identity={identity} />
      <View accessibilityLiveRegion="polite" className="gap-[12px]">
        <GateChip {...chip} />
        <Text
          accessibilityRole="header"
          className="max-w-[340px] text-hero-foreground"
          variant="screenTitle"
        >
          {title}
        </Text>
      </View>
    </GateHeroSurface>
  )
}
