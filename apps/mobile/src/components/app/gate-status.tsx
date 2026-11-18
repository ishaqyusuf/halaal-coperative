import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { type ReactNode } from "react"
import { ActivityIndicator, View } from "react-native"
import { useColors } from "@/hooks/use-color"

export type GateStatusTone = "brand" | "warm" | "danger" | "ok" | "neutral" | "sky"

const DISC: Record<GateStatusTone, [string, string, string]> = {
  // disc, icon/text, halo
  brand: ["bg-accent", "text-accent-foreground", "bg-accent-foreground/10"],
  danger: [
    "bg-tint-danger",
    "text-tint-danger-foreground",
    "bg-tint-danger-foreground/10",
  ],
  neutral: ["bg-surface-raised", "text-foreground-soft", "bg-foreground/5"],
  ok: [
    "bg-tint-success",
    "text-tint-success-foreground",
    "bg-tint-success-foreground/10",
  ],
  sky: ["bg-tint-sky", "text-tint-sky-foreground", "bg-tint-sky-foreground/10"],
  warm: [
    "bg-tint-warm",
    "text-tint-warm-foreground",
    "bg-tint-warm-foreground/10",
  ],
}

const SIZE = {
  72: ["size-[72px]", "size-[96px]", "size-xl"],
  76: ["size-[76px]", "size-[100px]", "size-xl"],
  92: ["size-[92px]", "size-[116px]", "size-2xl"],
} as const

/**
 * 03 Docked action status badge: a tinted disc with a soft halo ring
 * (12pt, 8% of the tone) around an icon or the cooperative's initials.
 */
export function GateStatusBadge({
  busy = false,
  icon,
  mark,
  size = 92,
  tone,
}: {
  busy?: boolean
  icon?: string
  /** Initials instead of an icon (unlock, identity). */
  mark?: string
  size?: 72 | 76 | 92
  tone: GateStatusTone
}) {
  const colors = useColors()
  const [disc, ink, halo] = DISC[tone]
  const [discSize, haloSize, iconSize] = SIZE[size]
  return (
    <View
      accessible={false}
      className={cn("items-center justify-center rounded-full", haloSize, halo)}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        className={cn("items-center justify-center rounded-full", discSize, disc)}
      >
        {busy ? (
          <ActivityIndicator color={colors.foreground} />
        ) : mark ? (
          <Text className={cn("text-[24px] font-extrabold", ink)} maxFontSizeMultiplier={1}>
            {mark}
          </Text>
        ) : icon ? (
          <Icon className={cn(iconSize, ink)} name={icon} />
        ) : null}
      </View>
    </View>
  )
}

const PILL: Record<GateStatusTone, string> = {
  brand: "bg-accent text-accent-foreground",
  danger: "bg-tint-danger text-tint-danger-foreground",
  neutral: "bg-surface-raised text-foreground-soft",
  ok: "bg-tint-success text-tint-success-foreground",
  sky: "bg-tint-sky text-tint-sky-foreground",
  warm: "bg-tint-warm text-tint-warm-foreground",
}

/**
 * Centred status block (03 Docked action): badge, tone pill, 26/32 title and
 * body, then any extra content (meta line, progress, note).
 */
export function CenteredStatus({
  badge,
  body,
  children,
  pill,
  title,
}: {
  badge: ReactNode
  body?: string
  children?: ReactNode
  pill?: { label: string; tone: GateStatusTone }
  title: string
}) {
  const [bg, fg] = pill ? PILL[pill.tone].split(" ") : ["", ""]
  return (
    <View
      accessibilityLiveRegion="polite"
      className="items-center gap-[8px] px-[8px]"
    >
      <View className="mb-[2px]">{badge}</View>
      {pill ? (
        <View className={cn("rounded-full px-[10px] py-[3px]", bg)}>
          <Text className={fg} variant="caption">
            {pill.label}
          </Text>
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        className="max-w-[330px] text-center"
        variant="screenTitle"
      >
        {title}
      </Text>
      {body ? (
        <Text
          className="max-w-[320px] text-center text-foreground-soft"
          variant="small"
        >
          {body}
        </Text>
      ) : null}
      {children}
    </View>
  )
}
