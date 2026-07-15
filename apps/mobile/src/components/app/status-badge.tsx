import { Text } from "@/components/ui/text"
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
  tone = "neutral",
}: {
  className?: string
  label: string
  tone?: StatusBadgeTone
}) {
  return (
    <View
      accessibilityLabel={label}
      className={cn(
        "min-h-7 shrink-0 items-center justify-center rounded-md border px-2.5 py-1",
        toneClass[tone].container,
        className
      )}
    >
      <Text
        adjustsFontSizeToFit
        className={cn("text-xs leading-4 font-semibold", toneClass[tone].text)}
        minimumFontScale={0.82}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}
