import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "neutral"
  | "lilac"

const TONE_CLASSES: Record<StatusTone, { surface: string; text: string }> = {
  success: { surface: "bg-tint-success", text: "text-tint-success-foreground" },
  warning: { surface: "bg-tint-warm", text: "text-tint-warm-foreground" },
  danger: { surface: "bg-tint-danger", text: "text-tint-danger-foreground" },
  info: { surface: "bg-tint-sky", text: "text-tint-sky-foreground" },
  brand: { surface: "bg-accent", text: "text-accent-foreground" },
  neutral: { surface: "bg-surface-raised", text: "text-foreground-soft" },
  lilac: { surface: "bg-tint-lilac", text: "text-tint-lilac-foreground" },
}

/** 22pt chip, 12/16·700, tinted by meaning (Active, Pending, Exception…). */
export function StatusPill({
  className,
  label,
  size = "default",
  tone = "neutral",
}: {
  className?: string
  label: string
  size?: "default" | "large"
  tone?: StatusTone
}) {
  const classes = TONE_CLASSES[tone]
  return (
    <View
      accessibilityLabel={`Status: ${label}`}
      className={cn(
        "flex-row items-center self-start rounded-full",
        size === "large" ? "min-h-[32px] px-[12px]" : "min-h-[22px] px-[10px]",
        classes.surface,
        className
      )}
    >
      <Text
        className={classes.text}
        numberOfLines={1}
        variant={size === "large" ? "label" : "caption"}
      >
        {label}
      </Text>
    </View>
  )
}

/** Maps common workflow words to a tone so screens stay consistent. */
export function statusToneFor(status: string): StatusTone {
  const value = status.toLowerCase()
  if (
    /(active|posted|paid|approved|verified|complete|settled|published|ready)/.test(
      value
    )
  )
    return "success"
  if (/(pending|review|waiting|due|draft|partial|queued|processing)/.test(value))
    return "warning"
  if (
    /(suspend|reject|fail|exception|overdue|reversed|declined|error|blocked|default)/.test(
      value
    )
  )
    return "danger"
  if (/(closed|inactive|waived|cancel|archived)/.test(value)) return "neutral"
  return "info"
}
