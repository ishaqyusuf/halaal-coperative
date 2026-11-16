import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { type ReactNode } from "react"
import { View } from "react-native"

export type SettingsRowTone =
  | "accent"
  | "sky"
  | "warm"
  | "lilac"
  | "success"
  | "danger"

const TILE: Record<SettingsRowTone, [string, string]> = {
  accent: ["bg-accent", "text-accent-foreground"],
  danger: ["bg-tint-danger", "text-tint-danger-foreground"],
  lilac: ["bg-tint-lilac", "text-tint-lilac-foreground"],
  sky: ["bg-tint-sky", "text-tint-sky-foreground"],
  success: ["bg-tint-success", "text-tint-success-foreground"],
  warm: ["bg-tint-warm", "text-tint-warm-foreground"],
}

/**
 * A settings or navigation row for ListCard (02): 38pt tinted icon tile
 * (radius 12), 16/700 title, wrapping 14/20 detail, then a value, control or
 * chevron. Separators from ListCard `inset` line up after the tile. Unlike
 * RecordRow the detail wraps, so settings copy is never cut off.
 */
export function SettingsRow({
  accessibilityLabel,
  chevron = false,
  destructive = false,
  detail,
  disabled = false,
  icon,
  onPress,
  testID,
  title,
  tone = "accent",
  trailing,
  value,
}: {
  accessibilityLabel?: string
  chevron?: boolean
  /** Danger title and tile (Remove app lock, Delete account). */
  destructive?: boolean
  detail?: string
  /** Dimmed and not pressable (e.g. a page unavailable in this build). */
  disabled?: boolean
  icon: string
  onPress?: () => void
  testID?: string
  title: string
  tone?: SettingsRowTone
  /** A control such as a Switch. */
  trailing?: ReactNode
  /** A short muted value, e.g. "Change" or "Available". */
  value?: string
}) {
  const [tileClass, iconClass] = TILE[destructive ? "danger" : tone]
  const content = (
    <View
      className={cn(
        "min-h-[62px] flex-row items-center gap-[12px] px-[14px] py-[12px]",
        disabled && "opacity-50"
      )}
    >
      <View
        className={cn(
          "size-[38px] items-center justify-center rounded-[12px]",
          tileClass
        )}
      >
        <Icon className={cn("size-base", iconClass)} name={icon} />
      </View>
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text
          className={cn("font-bold", destructive && "text-destructive")}
          variant="body"
        >
          {title}
        </Text>
        {detail ? (
          <Text className="text-muted-foreground" variant="small">
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text className="shrink-0 text-muted-foreground" variant="label">
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? (
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      ) : null}
    </View>
  )

  if (!onPress || disabled) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityState={disabled ? { disabled: true } : undefined}
        accessible={Boolean(accessibilityLabel) || disabled}
        testID={testID}
      >
        {content}
      </View>
    )
  }

  return (
    <Pressable
      accessibilityLabel={
        accessibilityLabel ?? [title, detail, value].filter(Boolean).join(", ")
      }
      accessibilityRole="button"
      className="active:bg-muted"
      haptic
      onPress={onPress}
      testID={testID}
    >
      {content}
    </Pressable>
  )
}
