import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { StatusPill, type StatusTone } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColorScheme } from "@/hooks/use-color"
import { avatarTints, shadows } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"
import { Children, isValidElement, type ReactNode } from "react"
import { View } from "react-native"

/** Card elevation for the active scheme (no shadow in dark, per T00). */
export function useCardShadow() {
  const { colorScheme } = useColorScheme()
  const value = shadows[colorScheme].card
  return value === "none" ? undefined : { boxShadow: value }
}

/**
 * A rounded group of rows (radius 20, card surface, hairline separators
 * inset past the avatar). Use RecordRow children for list records.
 */
export function ListCard({
  children,
  className,
  inset = true,
}: {
  children: ReactNode
  className?: string
  /** Separators start after the 52pt avatar column. */
  inset?: boolean
}) {
  const shadow = useCardShadow()
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <View
      className={cn("overflow-hidden rounded-[20px] bg-card", className)}
      style={shadow}
    >
      {rows.map((row, index) => (
        <View key={row.key ?? index}>
          {index > 0 ? (
            <View
              className={cn("h-px bg-border", inset ? "ml-[66px]" : "ml-[14px]")}
            />
          ) : null}
          {row}
        </View>
      ))}
    </View>
  )
}

export type RowPosition = "first" | "middle" | "last" | "only"

export function rowPosition(index: number, count: number): RowPosition {
  if (count <= 1) return "only"
  if (index === 0) return "first"
  if (index === count - 1) return "last"
  return "middle"
}

/** Stable tint for a name, so a member keeps one colour everywhere. */
export function avatarTintFor(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  return avatarTints[Math.abs(hash) % avatarTints.length]
}

const AVATAR_CLASSES: Record<string, string> = {
  accent: "bg-accent",
  tintWarm: "bg-tint-warm",
  tintSky: "bg-tint-sky",
  tintLilac: "bg-tint-lilac",
  tintVivid: "bg-tint-vivid",
}
const AVATAR_TEXT_CLASSES: Record<string, string> = {
  accentForeground: "text-accent-foreground",
  tintWarmForeground: "text-tint-warm-foreground",
  tintSkyForeground: "text-tint-sky-foreground",
  tintLilacForeground: "text-tint-lilac-foreground",
  tintVividForeground: "text-tint-vivid-foreground",
}

export function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? `${words[0]?.[0] ?? ""}${words.at(-1)?.[0] ?? ""}`
      : (words[0]?.slice(0, 2) ?? "")
  return letters.toUpperCase()
}

/** 40pt tinted avatar with initials or an icon (radius 14). */
export function TintedAvatar({
  icon,
  name,
  size = 40,
}: {
  icon?: string
  name: string
  size?: 40 | 52 | 56
}) {
  const tint = avatarTintFor(name)
  return (
    <View
      accessible={false}
      className={cn(
        "items-center justify-center rounded-[14px]",
        AVATAR_CLASSES[tint.background]
      )}
      style={{ height: size, width: size }}
    >
      {icon ? (
        <Icon
          className={cn("size-base", AVATAR_TEXT_CLASSES[tint.foreground])}
          name={icon}
        />
      ) : (
        <Text
          className={AVATAR_TEXT_CLASSES[tint.foreground]}
          variant={size > 40 ? "title" : "section"}
        >
          {initialsFor(name)}
        </Text>
      )}
    </View>
  )
}

/**
 * A list record: tinted avatar, 16/700 title, 14 meta, amount and status
 * on the right. Standalone inside ListCard; inside AppList pass `position`
 * so consecutive rows join into one rounded card.
 */
export function RecordRow({
  accessibilityLabel,
  amount,
  amountSuffix,
  avatarIcon,
  avatarName,
  chevron = false,
  leading,
  meta,
  onPress,
  position,
  status,
  statusTone,
  testID,
  title,
  trailing,
}: {
  accessibilityLabel?: string
  /** Pre-formatted, e.g. formatMoney(25000). */
  amount?: string
  amountSuffix?: string
  avatarIcon?: string
  /** Seeds the initials and tint; defaults to the title. */
  avatarName?: string
  chevron?: boolean
  /** Replaces the avatar (e.g. a checkbox or icon tile). */
  leading?: ReactNode
  meta?: string
  onPress?: () => void
  position?: RowPosition
  status?: string
  statusTone?: StatusTone
  testID?: string
  title: string
  trailing?: ReactNode
}) {
  const grouped = position !== undefined
  const content = (
    <View className="min-h-16 flex-row items-center gap-3 px-[14px] py-2.5">
      {leading ?? (
        <TintedAvatar icon={avatarIcon} name={avatarName ?? title} />
      )}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-bold" numberOfLines={1} variant="body">
          {title}
        </Text>
        {meta ? (
          <Text className="text-muted-foreground" numberOfLines={1} variant="small">
            {meta}
          </Text>
        ) : null}
      </View>
      {amount || status || trailing ? (
        <View className="shrink-0 items-end gap-1">
          {amount ? (
            <Text numberOfLines={1} variant="money">
              {amount}
              {amountSuffix ? (
                <Text className="text-muted-foreground" variant="small">
                  {amountSuffix}
                </Text>
              ) : null}
            </Text>
          ) : null}
          {status ? <StatusPill label={status} tone={statusTone} /> : null}
          {trailing}
        </View>
      ) : null}
      {chevron ? (
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      ) : null}
    </View>
  )

  const groupClassName = grouped
    ? cn(
        "mx-[18px] bg-card",
        (position === "first" || position === "only") && "rounded-t-[20px]",
        (position === "last" || position === "only") && "rounded-b-[20px]"
      )
    : undefined

  const body = onPress ? (
    <Pressable
      accessibilityLabel={
        accessibilityLabel ??
        [title, meta, amount, status].filter(Boolean).join(", ")
      }
      accessibilityRole="button"
      className={cn("active:bg-muted", grouped && "overflow-hidden")}
      haptic
      onPress={onPress}
      testID={testID}
    >
      {content}
    </Pressable>
  ) : (
    <View testID={testID}>{content}</View>
  )

  if (!grouped) return body
  return (
    <View className={cn(groupClassName, "overflow-hidden")}>
      {position === "middle" || position === "last" ? (
        <View className="ml-[66px] h-px bg-border" />
      ) : null}
      {body}
    </View>
  )
}
