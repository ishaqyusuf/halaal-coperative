import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { THEME } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Children, isValidElement, type ReactNode } from "react"
import { View } from "react-native"

/**
 * Solid icon tiles of 03 Docked action (white icon on a filled 30pt tile).
 * The tile colours are the light-theme accents in both themes, like iOS
 * settings icons.
 */
const TILE: Record<GroupedTone, string> = {
  amber: THEME.light.brandWarm,
  danger: THEME.light.destructive,
  mint: THEME.light.primary,
  neutral: THEME.light.mutedForeground,
  sky: THEME.light.tintSkyForeground,
}

export type GroupedTone = "mint" | "amber" | "sky" | "danger" | "neutral"

/**
 * 03 Docked action grouped section: an uppercase caption, then a card
 * (radius 14, no shadow) of rows with hairline separators after the tile,
 * and an optional footnote under it.
 */
export function GroupedSection({
  caption,
  children,
  footnote,
}: {
  caption?: string
  children: ReactNode
  footnote?: string
}) {
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <View className="gap-[7px]">
      {caption ? (
        <Text
          accessibilityRole="header"
          className="px-[16px] uppercase tracking-[0.8px] text-muted-foreground"
          variant="caption"
        >
          {caption}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-[14px] bg-card">
        {rows.map((row, index) => (
          <View key={row.key ?? index}>
            {index > 0 ? <View className="ml-[58px] h-px bg-border" /> : null}
            {row}
          </View>
        ))}
      </View>
      {footnote ? (
        <Text className="px-[16px] text-muted-foreground" variant="small">
          {footnote}
        </Text>
      ) : null}
    </View>
  )
}

/** A 03 grouped row: solid tile (or avatar), title, wrapping detail, end. */
export function GroupedRow({
  accessibilityLabel,
  avatar,
  chevron = false,
  destructive = false,
  detail,
  icon,
  onPress,
  testID,
  title,
  tone = "mint",
  trailing,
  value,
}: {
  accessibilityLabel?: string
  /** Initials in a 30pt tinted circle instead of an icon tile. */
  avatar?: string
  chevron?: boolean
  destructive?: boolean
  detail?: string
  icon?: string
  onPress?: () => void
  testID?: string
  title: string
  tone?: GroupedTone
  trailing?: ReactNode
  value?: string
}) {
  const content = (
    <View className="min-h-[52px] flex-row items-center gap-[12px] px-[16px] py-[8px]">
      {avatar ? (
        <View className="size-[30px] items-center justify-center rounded-full bg-accent">
          <Text
            className="text-[12px] font-bold text-accent-foreground"
            maxFontSizeMultiplier={1}
          >
            {avatar}
          </Text>
        </View>
      ) : icon ? (
        // Style-only tile: a runtime token colour (contract exception).
        <View
          style={{
            alignItems: "center",
            backgroundColor: TILE[destructive ? "danger" : tone],
            borderRadius: 8,
            height: 30,
            justifyContent: "center",
            width: 30,
          }}
        >
          <Icon className="size-[18px]" color={THEME.light.card} name={icon} />
        </View>
      ) : null}
      <View className="min-w-0 flex-1 gap-[1px]">
        <Text
          className={cn("font-medium", destructive && "text-destructive")}
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
  if (!onPress) {
    return (
      <View accessibilityLabel={accessibilityLabel} testID={testID}>
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
