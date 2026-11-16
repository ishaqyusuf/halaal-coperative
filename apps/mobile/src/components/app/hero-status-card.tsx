import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { type ReactNode } from "react"
import { ActivityIndicator, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"

/**
 * The settings-screen status card of 02 Brand hero (workshop 03, App lock and
 * App updates): a gradient card (radius 28, padding 18) inside the gutter
 * with a 44pt icon tile, a pill or meta line, a 26/32 headline, the message,
 * optional progress and a light primary action. The page title stays a
 * normal ScreenShell header above it.
 */
export function HeroStatusCard({
  action,
  busy = false,
  children,
  icon,
  message,
  meta,
  pill,
  title,
  tone = "default",
}: {
  action?: {
    accessibilityLabel?: string
    disabled?: boolean
    icon?: string
    label: string
    onPress: () => void
  }
  /** Spinner in the icon tile and the action. */
  busy?: boolean
  /** Extra content under the message (e.g. HeroProgress). */
  children?: ReactNode
  icon: string
  message: string
  /** Right of the icon tile: a short line such as "Version 1.0.0 · Not checked". */
  meta?: string
  /** Right of the icon tile: a pill such as "Protected". */
  pill?: string
  title: string
  /** `error` tints the icon tile. */
  tone?: "default" | "error"
}) {
  const colors = useColors()
  return (
    <View
      style={{
        backgroundColor: colors.heroMid,
        borderRadius: 28,
        experimental_backgroundImage: `linear-gradient(160deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
        overflow: "hidden",
        padding: 18,
      }}
    >
      <View
        accessible={false}
        className="absolute -top-[50px] -right-[50px] size-[170px] rounded-full bg-hero-foreground/5"
        importantForAccessibility="no"
        pointerEvents="none"
      />
      <View className="gap-[14px]">
        <View className="flex-row items-center justify-between gap-[12px]">
          <View
            className={cn(
              "size-[44px] items-center justify-center rounded-[14px]",
              tone === "error" ? "bg-tint-danger" : "bg-hero-foreground/15"
            )}
          >
            {busy ? (
              <ActivityIndicator color={colors.heroForeground} size="small" />
            ) : (
              <Icon
                className={cn(
                  "size-base",
                  tone === "error"
                    ? "text-tint-danger-foreground"
                    : "text-hero-foreground"
                )}
                name={icon}
              />
            )}
          </View>
          {pill ? (
            <View className="rounded-full bg-hero-foreground/15 px-[10px] py-[4px]">
              <Text className="text-hero-foreground" variant="caption">
                {pill}
              </Text>
            </View>
          ) : meta ? (
            <Text
              className="min-w-0 flex-1 text-right text-hero-foreground/80"
              numberOfLines={2}
              variant="caption"
            >
              {meta}
            </Text>
          ) : null}
        </View>
        <View accessibilityLiveRegion="polite" className="gap-[6px]">
          <Text
            accessibilityRole="header"
            className="text-hero-foreground"
            variant="screenTitle"
          >
            {title}
          </Text>
          <Text className="text-hero-foreground/80" variant="small">
            {message}
          </Text>
        </View>
        {children}
        {action ? <HeroCardButton busy={busy} {...action} /> : null}
      </View>
    </View>
  )
}

function HeroCardButton({
  accessibilityLabel,
  busy,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  accessibilityLabel?: string
  busy: boolean
  disabled?: boolean
  icon?: string
  label: string
  onPress: () => void
}) {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const inert = disabled || busy
  // The Pressable never receives `disabled` (T02: react-native-css left the
  // :active style stuck); inert presses are dropped here instead.
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: inert }}
      className={cn(
        "h-[52px] flex-row items-center justify-center gap-[8px] rounded-[16px] bg-hero-foreground",
        inert && "opacity-60",
        !inert && !reduceMotion && "active:scale-[0.97]"
      )}
      haptic={!inert}
      onPress={inert ? undefined : onPress}
    >
      {busy ? (
        <ActivityIndicator color={colors.heroMid} size="small" />
      ) : icon ? (
        <Icon className="size-base" color={colors.heroMid} name={icon} />
      ) : null}
      <Text className="font-bold text-hero-mid" variant="body">
        {label}
      </Text>
    </Pressable>
  )
}

/** Download progress on the hero card: 8pt track and "NN% downloaded". */
export function HeroProgress({ label, value }: { label: string; value: number }) {
  const colors = useColors()
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <View
      accessibilityLabel={`${label}, ${clamped}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: clamped }}
      accessible
      className="gap-[6px]"
    >
      <View className="flex-row justify-between">
        <Text className="text-hero-foreground/80" variant="caption">
          {label}
        </Text>
        <Text className="text-hero-foreground" variant="caption">
          {clamped}% downloaded
        </Text>
      </View>
      <View className="h-[8px] overflow-hidden rounded-full bg-hero-foreground/20">
        {/* Style-only: a measured width cannot share an element with className. */}
        <View
          style={{
            backgroundColor: colors.heroForeground,
            borderRadius: 999,
            height: 8,
            width: `${clamped}%`,
          }}
        />
      </View>
    </View>
  )
}
