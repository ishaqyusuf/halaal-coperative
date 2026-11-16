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
  label,
  value,
  tabular = false,
}: {
  label: string
  value: ReactNode
  tabular?: boolean
}) {
  return (
    <View className="min-h-[48px] flex-row items-center justify-between gap-[16px] px-[14px] py-[12px]">
      <Text className="text-muted-foreground" variant="body">
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text
          className="min-w-0 shrink text-right"
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
}

function ResultActions({
  primary,
  secondary,
}: {
  primary?: ResultAction
  secondary?: ResultAction
}) {
  const insets = useSafeAreaInsets()
  if (!primary && !secondary) return null
  return (
    <View
      style={{
        gap: 12,
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
          variant="secondary"
        >
          <Text>{secondary.label}</Text>
        </Button>
      ) : null}
    </View>
  )
}

function ResultBadge({ tone }: { tone: "success" | "error" }) {
  return (
    <View
      className={cn(
        "size-[124px] items-center justify-center rounded-full border-2",
        tone === "success"
          ? "border-tint-success bg-transparent"
          : "border-tint-danger bg-transparent"
      )}
    >
      <View
        className={cn(
          "size-[96px] items-center justify-center rounded-full",
          tone === "success" ? "bg-tint-success" : "bg-tint-danger"
        )}
      >
        <Icon
          className={cn(
            "size-2xl",
            tone === "success"
              ? "text-tint-success-foreground"
              : "text-tint-danger-foreground"
          )}
          name={tone === "success" ? "Check" : "CircleAlert"}
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
  description,
  details,
  onDone,
  primary,
  secondary,
  title,
  tone,
}: {
  description?: ReactNode
  details?: ReactNode
  onDone?: () => void
  primary?: ResultAction
  secondary?: ResultAction
  title: string
  tone: "success" | "error"
}) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  return (
    <View
      style={{ backgroundColor: colors.background, flex: 1, paddingTop: insets.top }}
    >
      <View className="min-h-[56px] flex-row items-center justify-end px-[18px]">
        {onDone ? (
          <Pressable
            accessibilityLabel="Done"
            accessibilityRole="button"
            className="min-h-[44px] justify-center px-[4px]"
            hitSlop={8}
            onPress={onDone}
          >
            <Text className="text-primary" variant="section">
              Done
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center gap-[16px] px-[24px] pb-[24px]"
        showsVerticalScrollIndicator={false}
      >
        <ResultBadge tone={tone} />
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="header"
          className="text-center"
          variant="screenTitle"
        >
          {title}
        </Text>
        {description ? (
          <Text className="text-center text-foreground-soft" variant="body">
            {description}
          </Text>
        ) : null}
        {details ? (
          <View className="mt-[8px] w-full">
            <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
              {details}
            </Elevated>
          </View>
        ) : null}
      </ScrollView>
      <ResultActions primary={primary} secondary={secondary} />
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
