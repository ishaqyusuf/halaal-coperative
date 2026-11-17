import { initialsFor } from "@/components/ui/list-card"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { Children, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"

const tileColors = {
  mint: "bg-settings-tile-mint",
  amber: "bg-settings-tile-amber",
  sky: "bg-settings-tile-sky",
  rose: "bg-settings-tile-rose",
  lilac: "bg-settings-tile-lilac",
  neutral: "bg-settings-tile-neutral",
  success: "bg-settings-tile-success",
  danger: "bg-settings-tile-danger",
}

export type SettingsTile = keyof typeof tileColors

export function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <Text
      accessibilityRole="header"
      className="mx-[16px] mb-[7px] tracking-wider text-muted-foreground uppercase"
      variant="caption"
    >
      {children}
    </Text>
  )
}

export function SettingsGroup({
  children,
  flush = false,
  title,
}: {
  children: ReactNode
  flush?: boolean
  title?: string
}) {
  return (
    <View>
      {title ? <GroupHeading>{title}</GroupHeading> : null}
      <View className="overflow-hidden rounded-[14px] bg-card">
        {Children.toArray(children).map((child, index) => (
          <View key={index}>
            {index > 0 ? <SettingsDivider flush={flush} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  )
}

export function SettingsDivider({ flush = false }: { flush?: boolean }) {
  return (
    <View
      className={cn(
        "bg-muted-foreground/45",
        flush ? "ml-[16px]" : "ml-[58px]"
      )}
    >
      <View style={{ height: StyleSheet.hairlineWidth }} />
    </View>
  )
}

export function SettingsAvatar({
  name,
  large = false,
}: {
  name: string
  large?: boolean
}) {
  return (
    <View
      className={cn(
        "shrink-0 items-center justify-center rounded-full bg-accent",
        large ? "size-[48px] self-start" : "size-[30px]"
      )}
    >
      <Text
        className="text-accent-foreground"
        variant={large ? "section" : "caption"}
      >
        {initialsFor(name)}
      </Text>
    </View>
  )
}

export function SettingsTileIcon({
  icon,
  tone,
}: {
  icon: string
  tone: SettingsTile
}) {
  return (
    <View
      className={cn(
        "size-[30px] items-center justify-center rounded-[8px]",
        tileColors[tone]
      )}
    >
      <Icon
        className="text-hero-foreground size-[18px]"
        strokeWidth={2.1}
        name={icon}
      />
    </View>
  )
}

export function GroupedRow({
  accessibilityLabel,
  avatar,
  detail,
  disabled,
  icon,
  onPress,
  primary,
  supporting,
  title,
  tone = "mint",
  trailing,
  value,
  valueTone = "muted",
  large = false,
}: {
  accessibilityLabel?: string
  avatar?: string
  detail?: string
  disabled?: boolean
  icon?: string
  onPress?: () => void
  primary?: boolean
  supporting?: ReactNode
  title: string
  tone?: SettingsTile
  trailing?: ReactNode
  value?: string
  valueTone?: "muted" | "warning" | "success" | "badge"
  large?: boolean
}) {
  const content = (
    <View
      className={cn(
        "min-h-[52px] flex-row items-center gap-[12px] py-[8px] pr-[14px] pl-[16px]",
        large && "min-h-[96px] py-[10px]",
        disabled && "opacity-50"
      )}
    >
      {avatar ? (
        <SettingsAvatar large={large} name={avatar} />
      ) : icon ? (
        <SettingsTileIcon icon={icon} tone={tone} />
      ) : null}
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text
          className={cn(primary && "font-semibold text-primary")}
          variant={large ? "title" : "body"}
        >
          {title}
        </Text>
        {detail ? (
          <Text className="text-muted-foreground" variant="small">
            {detail}
          </Text>
        ) : null}
        {supporting}
      </View>
      {value ? (
        <Text
          className={cn(
            "max-w-[32%] text-right",
            valueTone === "muted" && "text-muted-foreground",
            valueTone === "success" && "text-tint-success-foreground",
            valueTone === "warning" && "text-tint-warm-foreground",
            valueTone === "badge" &&
              "text-hero-foreground rounded-full bg-destructive px-[7px]"
          )}
          variant="label"
        >
          {value}
        </Text>
      ) : null}
      {trailing ??
        (onPress ? (
          <Icon
            className="size-[18px] shrink-0 text-muted-foreground"
            name="ChevronRight"
          />
        ) : null)}
    </View>
  )

  if (!onPress) return content
  return (
    <Pressable
      accessibilityLabel={
        accessibilityLabel ?? [title, detail, value].filter(Boolean).join(", ")
      }
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="active:bg-muted"
      disabled={disabled}
      haptic
      onPress={onPress}
    >
      {content}
    </Pressable>
  )
}
