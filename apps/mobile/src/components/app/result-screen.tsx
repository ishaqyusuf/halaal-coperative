import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { resolveDockedFooterInset } from "@/lib/docked-footer-inset"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useColors } from "@/hooks/use-color"
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { Children, isValidElement } from "react"

/**
 * The write-flow result states from T00 screen 8: review → submitting →
 * success | error. Render inside AppSheet `form` (or a pushed screen) in
 * place of the form body; each state owns its docked actions.
 */

export function ReviewSummary({
  children,
  title,
  onEdit,
}: {
  children: ReactNode
  title: string
  onEdit?: () => void
}) {
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <View className="gap-[8px]">
      <View className="min-h-[44px] flex-row items-center justify-between">
        <Text accessibilityRole="header" variant="section">
          {title}
        </Text>
        {onEdit ? (
          <Pressable
            accessibilityLabel={`Edit ${title}`}
            accessibilityRole="button"
            className="min-h-[44px] justify-center px-[4px]"
            hitSlop={8}
            onPress={onEdit}
          >
            <Text className="text-primary" variant="label">
              Edit
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
        {rows.map((row, index) => (
          <View key={row.key ?? index}>
            {index > 0 ? <View className="mx-[14px] h-px bg-border" /> : null}
            {row}
          </View>
        ))}
      </Elevated>
    </View>
  )
}

/** "Member number ……… QHC-0026" inside ReviewSummary or a success card. */
export function ReviewRow({
  compact = false,
  label,
  value,
  tabular = false,
}: {
  compact?: boolean
  label: string
  value: ReactNode
  tabular?: boolean
}) {
  return (
    <View
      className={cn(
        "min-h-[48px] flex-row items-center justify-between gap-[16px]",
        compact ? "px-[16px] py-[13px]" : "px-[14px] py-[12px]"
      )}
    >
      <Text
        className="text-muted-foreground"
        variant={compact ? "small" : "body"}
      >
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text
          className={cn(
            "min-w-0 shrink text-right",
            compact && "max-w-[62%] font-bold"
          )}
          tabular={tabular}
          variant="body"
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  )
}

type ResultAction = {
  label: string
  onPress: () => void
  loading?: boolean
  variant?: "ghost" | "secondary"
}

function ResultActions({
  compact,
  primary,
  secondary,
}: {
  compact: boolean
  primary?: ResultAction
  secondary?: ResultAction
}) {
  const insets = useSafeAreaInsets()
  if (!primary && !secondary) return null
  return (
    <View
      style={{
        gap: compact ? 8 : 12,
        paddingBottom: resolveDockedFooterInset(insets.bottom, Platform.OS),
        paddingHorizontal: 18,
        paddingTop: 12,
      }}
    >
      {primary ? (
        <Button loading={primary.loading} onPress={primary.onPress}>
          <Text>{primary.label}</Text>
        </Button>
      ) : null}
      {secondary ? (
        <Button
          loading={secondary.loading}
          onPress={secondary.onPress}
          variant={secondary.variant ?? "secondary"}
        >
          <Text>{secondary.label}</Text>
        </Button>
      ) : null}
    </View>
  )
}

type ResultTone = "success" | "error" | "warning" | "info"

function ResultBadge({
  compact,
  icon,
  tone,
}: {
  compact: boolean
  icon?: string
  tone: ResultTone
}) {
  const palette = {
    success: {
      border: "border-tint-success",
      ring: "bg-success/10",
      fill: "bg-tint-success",
      ink: "text-success",
      tintedInk: "text-tint-success-foreground",
      icon: "Check",
    },
    error: {
      border: "border-tint-danger",
      ring: "bg-destructive/10",
      fill: "bg-tint-danger",
      ink: "text-destructive",
      tintedInk: "text-tint-danger-foreground",
      icon: "CircleAlert",
    },
    info: {
      border: "border-tint-sky",
      ring: "bg-tint-sky/55",
      fill: "bg-tint-sky",
      ink: "text-tint-sky-foreground",
      tintedInk: "text-tint-sky-foreground",
      icon: "CircleAlert",
    },
    warning: {
      border: "border-tint-warm",
      ring: "bg-tint-warm/55",
      fill: "bg-tint-warm",
      ink: "text-tint-warm-foreground",
      tintedInk: "text-tint-warm-foreground",
      icon: "CircleAlert",
    },
  }[tone]
  return (
    <View
      className={cn(
        "items-center justify-center rounded-full",
        compact
          ? cn("size-[96px]", palette.ring)
          : cn("size-[124px] border-2", palette.border)
      )}
    >
      <View
        className={cn(
          "items-center justify-center rounded-full",
          compact ? "size-[76px]" : "size-[96px]",
          palette.fill
        )}
      >
        <Icon
          className={cn(
            compact ? "size-xl" : "size-2xl",
            compact ? palette.ink : palette.tintedInk
          )}
          name={icon ?? palette.icon}
          strokeWidth={2.4}
        />
      </View>
    </View>
  )
}

/**
 * Full-height outcome: success (green check) or error (red alert with a
 * retry). `details` renders a card of ReviewRow children under the copy.
 */
export function ResultScreen({
  align = "center",
  badgeIcon,
  badges,
  compact = false,
  description,
  details,
  dismissIcon,
  onDone,
  primary,
  secondary,
  title,
  titleVariant,
  tone,
}: {
  align?: "center" | "top"
  badgeIcon?: string
  badges?: ReactNode
  compact?: boolean
  description?: ReactNode
  details?: ReactNode
  dismissIcon?: string
  onDone?: () => void
  primary?: ResultAction
  secondary?: ResultAction
  title: string
  titleVariant?: "title" | "screenTitle"
  tone: ResultTone
}) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  return (
    <View
      style={{
        backgroundColor: colors.background,
        flex: 1,
        paddingTop: insets.top,
      }}
    >
      <OverlayStatusBar />
      {!compact || onDone ? (
        <View className="min-h-[56px] flex-row items-center justify-end px-[18px]">
          {onDone ? (
            <Pressable
              accessibilityLabel={dismissIcon ? "Close result" : "Done"}
              accessibilityRole="button"
              className={cn(
                "min-h-[44px] justify-center px-[4px]",
                dismissIcon &&
                  "size-[44px] items-center rounded-full bg-card shadow-sm"
              )}
              hitSlop={8}
              onPress={onDone}
            >
              {dismissIcon ? (
                <Icon
                  className="size-base text-foreground"
                  name={dismissIcon}
                />
              ) : (
                <Text className="text-primary" variant="section">
                  Done
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        contentContainerClassName={cn(
          "flex-grow items-center px-[24px] pb-[24px]",
          compact ? "gap-[14px]" : "gap-[16px]",
          align === "top" ? "pt-[36px]" : "justify-center"
        )}
        showsVerticalScrollIndicator={false}
      >
        <ResultBadge compact={compact} icon={badgeIcon} tone={tone} />
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="header"
          className="text-center"
          variant={titleVariant ?? (compact ? "title" : "screenTitle")}
        >
          {title}
        </Text>
        {description ? (
          <Text
            className={cn(
              "text-center",
              compact
                ? "max-w-[300px] text-muted-foreground"
                : "text-foreground-soft"
            )}
            variant="body"
          >
            {description}
          </Text>
        ) : null}
        {badges ? (
          <View className="flex-row flex-wrap justify-center gap-[6px]">
            {badges}
          </View>
        ) : null}
        {details ? (
          <View className="mt-[8px] w-full">
            <Elevated
              className="overflow-hidden rounded-[20px] bg-card"
              radius={20}
            >
              {details}
            </Elevated>
          </View>
        ) : null}
      </ScrollView>
      <ResultActions
        compact={compact}
        primary={primary}
        secondary={secondary}
      />
    </View>
  )
}

/** Blocking "Submitting…" state: spinner, title and the reassurance line. */
export function SubmittingState({
  description = "Keep the app open. This usually takes a few seconds.",
  title = "Submitting…",
}: {
  description?: string
  title?: string
}) {
  const colors = useColors()
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      className="flex-1 items-center justify-center gap-[16px] bg-background px-[24px]"
    >
      <View className="size-[96px] items-center justify-center rounded-full bg-accent">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
      <Text className="text-center" variant="title">
        {title}
      </Text>
      <Text className="text-center text-muted-foreground" variant="body">
        {description}
      </Text>
    </View>
  )
}
