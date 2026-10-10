import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { View } from "react-native"

const toneClass = {
  blocked: {
    container: "border-warn/40 bg-warn/10",
    text: "text-warn",
  },
  destructive: {
    container: "border-destructive/40 bg-destructive/10",
    text: "text-destructive",
  },
  muted: {
    container: "border-border bg-secondary",
    text: "text-secondary-foreground",
  },
  neutral: {
    container: "border-border bg-muted",
    text: "text-muted-foreground",
  },
  success: {
    container: "border-success/40 bg-success/10",
    text: "text-success",
  },
  warning: {
    container: "border-warn/40 bg-warn/10",
    text: "text-warn",
  },
}

export type StatusBadgeTone = keyof typeof toneClass

export function getStatusBadgeTone(value: string | null | undefined) {
  const normalized = value?.toLowerCase().replace(/\s+/g, "_") ?? ""

  if (
    [
      "active",
      "approved",
      "complete",
      "completed",
      "current",
      "paid",
      "posted",
      "published",
      "ready",
      "verified",
    ].includes(normalized)
  ) {
    return "success"
  }

  if (
    [
      "blocked",
      "correction_requested",
      "in_progress",
      "needs_attention",
      "pending",
      "submitted",
      "under_review",
    ].includes(normalized)
  ) {
    return "warning"
  }

  if (
    ["defaulted", "failed", "inactive", "rejected", "suspended"].includes(
      normalized
    )
  ) {
    return "destructive"
  }

  return "muted"
}

export function StatusBadge({
  className,
  label,
  textScale,
  tone = "neutral",
  wrap = false,
}: {
  className?: string
  label: string
  textScale?: number
  tone?: StatusBadgeTone
  wrap?: boolean
}) {
  const colors = useColors()
  const textColor = {
    blocked: colors.warn,
    destructive: colors.destructive,
    muted: colors.secondaryForeground,
    neutral: colors.mutedForeground,
    success: colors.success,
    warning: colors.warn,
  }[tone]

  return (
    <View
      accessibilityLabel={label}
      className={cn(
        "min-h-7 shrink-0 items-center justify-center self-start rounded-full border px-2.5 py-1",
        toneClass[tone].container,
        className
      )}
    >
      <Text
        adjustsFontSizeToFit={!wrap}
        allowFontScaling={textScale === undefined}
        className={cn("text-xs leading-4 font-semibold", toneClass[tone].text)}
        minimumFontScale={wrap ? undefined : 0.82}
        numberOfLines={wrap ? undefined : 1}
        style={{
          color: textColor,
          ...(textScale === undefined
            ? null
            : {
                fontSize: 12 * textScale,
                fontWeight: "600" as const,
                lineHeight: 16 * textScale,
              }),
        }}
      >
        {label}
      </Text>
    </View>
  )
}
