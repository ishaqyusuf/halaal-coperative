import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { Children, isValidElement, type ReactNode } from "react"
import { View } from "react-native"

export type StatusCardTone =
  | "brand"
  | "warning"
  | "danger"
  | "success"
  | "info"
  | "neutral"

const TILE: Record<StatusCardTone, { surface: string; text: string }> = {
  brand: { surface: "bg-accent", text: "text-accent-foreground" },
  danger: { surface: "bg-tint-danger", text: "text-tint-danger-foreground" },
  info: { surface: "bg-tint-sky", text: "text-tint-sky-foreground" },
  neutral: { surface: "bg-surface-raised", text: "text-foreground-soft" },
  success: { surface: "bg-tint-success", text: "text-tint-success-foreground" },
  warning: { surface: "bg-tint-warm", text: "text-tint-warm-foreground" },
}

/** A tinted rounded icon tile (44pt in cards, 40pt in rows). */
export function StatusTile({
  icon,
  size = 44,
  tone,
}: {
  icon: string
  size?: 40 | 44 | 56
  tone: StatusCardTone
}) {
  return (
    <View
      className={cn(
        "shrink-0 items-center justify-center",
        size === 56
          ? "size-[56px] rounded-full"
          : size === 44
            ? "size-[44px] rounded-[14px]"
            : "size-[40px] rounded-[12px]",
        TILE[tone].surface
      )}
    >
      <Icon
        className={cn(size === 40 ? "size-[18px]" : "size-[22px]", TILE[tone].text)}
        name={icon}
      />
    </View>
  )
}

/**
 * 03 Status card (T26): one elevated card that says where something stands,
 * with a tinted tile, a status pill, a title and a short body. Extra content
 * (progress steps, a reference) sits under the top row.
 */
export function StatusCard({
  body,
  children,
  icon,
  pill,
  testID,
  title,
  tone,
}: {
  body?: string
  children?: ReactNode
  icon: string
  pill?: string
  testID?: string
  title: string
  tone: StatusCardTone
}) {
  return (
    <Elevated className="rounded-[20px] bg-card" radius={20}>
      <View
        accessibilityLiveRegion="polite"
        className="gap-[14px] p-[16px]"
        testID={testID}
      >
        <View className="flex-row items-start gap-[14px]">
          <StatusTile icon={icon} tone={tone} />
          <View className="min-w-0 flex-1 gap-[4px]">
            {pill ? (
              <StatusPill label={pill} tone={tone === "success" ? "success" : tone} />
            ) : null}
            <Text accessibilityRole="header" variant="title">
              {title}
            </Text>
            {body ? (
              <Text className="text-muted-foreground" variant="small">
                {body}
              </Text>
            ) : null}
          </View>
        </View>
        {children}
      </View>
    </Elevated>
  )
}

/** A section heading (16/700) with an optional muted side label. */
export function StatusSectionHeading({
  side,
  title,
}: {
  side?: string
  title: string
}) {
  return (
    <View className="flex-row items-end justify-between gap-[12px] px-[2px] pt-[8px]">
      <Text accessibilityRole="header" className="min-w-0 flex-1" variant="section">
        {title}
      </Text>
      {side ? (
        <Text className="text-muted-foreground" variant="label">
          {side}
        </Text>
      ) : null}
    </View>
  )
}

/** A heading, then one elevated card of rows with hairlines between them. */
export function StatusSection({
  children,
  footnote,
  side,
  testID,
  title,
}: {
  children: ReactNode
  footnote?: string
  side?: string
  testID?: string
  title?: string
}) {
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <View className="gap-[9px]" testID={testID}>
      {title ? <StatusSectionHeading side={side} title={title} /> : null}
      <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
        {rows.map((row, index) => (
          <View key={row.key ?? index}>
            {index > 0 ? <View className="ml-[68px] h-px bg-border" /> : null}
            {row}
          </View>
        ))}
      </Elevated>
      {footnote ? (
        <Text className="px-[4px] text-muted-foreground" variant="small">
          {footnote}
        </Text>
      ) : null}
    </View>
  )
}

/** A row: 40pt tinted tile, title, wrapping meta, trailing pill and chevron. */
export function StatusRow({
  accessibilityHint,
  accessibilityLabel,
  alignTop = false,
  chevron = false,
  dimmed = false,
  icon,
  meta,
  onPress,
  testID,
  title,
  tone = "brand",
  trailing,
}: {
  accessibilityHint?: string
  accessibilityLabel?: string
  alignTop?: boolean
  chevron?: boolean
  dimmed?: boolean
  icon: string
  meta?: string
  onPress?: () => void
  testID?: string
  title: string
  tone?: StatusCardTone
  trailing?: ReactNode
}) {
  const content = (
    <View
      className={cn(
        "min-h-[64px] flex-row gap-[14px] px-[14px] py-[12px]",
        alignTop ? "items-start" : "items-center"
      )}
    >
      <View className={dimmed ? "opacity-70" : undefined}>
        <StatusTile icon={icon} size={40} tone={tone} />
      </View>
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text
          className={cn("font-bold", dimmed ? "text-muted-foreground" : "text-foreground")}
          variant="body"
        >
          {title}
        </Text>
        {meta ? (
          <Text className="text-muted-foreground" variant="small">
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? (
        <Icon className="size-[18px] text-muted-foreground" name="ChevronRight" />
      ) : null}
    </View>
  )
  if (!onPress) return content
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? title}
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

/** A centred block card for empty, blocked and failed states. */
export function StatusBlock({
  action,
  body,
  icon,
  testID,
  title,
  tone,
}: {
  action?: { icon?: string; label: string; onPress: () => void; variant?: "default" | "secondary" }
  body?: string
  icon: string
  testID?: string
  title: string
  tone: StatusCardTone
}) {
  return (
    <Elevated className="rounded-[20px] bg-card" radius={20}>
      <View
        accessibilityLiveRegion="polite"
        className="items-center gap-[6px] px-[20px] pt-[26px] pb-[22px]"
        testID={testID}
      >
        <View className="mb-[6px]">
          <StatusTile icon={icon} tone={tone} />
        </View>
        <Text accessibilityRole="header" className="text-center" variant="section">
          {title}
        </Text>
        {body ? (
          <Text className="max-w-[280px] text-center text-muted-foreground" variant="small">
            {body}
          </Text>
        ) : null}
        {action ? (
          <Button
            className="mt-[12px] px-[18px]"
            onPress={action.onPress}
            size="sm"
            variant={action.variant ?? "default"}
          >
            {action.icon ? (
              <Icon
                className={cn(
                  "size-[16px]",
                  action.variant === "secondary"
                    ? "text-accent-foreground"
                    : "text-primary-foreground"
                )}
                name={action.icon}
              />
            ) : null}
            <Text>{action.label}</Text>
          </Button>
        ) : null}
      </View>
    </Elevated>
  )
}
