import { Icon } from "@/components/ui/icon"
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
  success: { surface: "bg-tint-success", text: "text-tint-success-foreground/85" },
  warning: { surface: "bg-tint-warm", text: "text-tint-warm-foreground/85" },
  danger: { surface: "bg-tint-danger", text: "text-tint-danger-foreground/85" },
  info: { surface: "bg-tint-sky", text: "text-tint-sky-foreground/85" },
  brand: { surface: "bg-accent", text: "text-accent-foreground/85" },
  neutral: { surface: "bg-surface-raised", text: "text-foreground-soft" },
  lilac: { surface: "bg-tint-lilac", text: "text-tint-lilac-foreground/85" },
}

/**
 * 22pt chip, 12/16·600, tinted by meaning (Active, Pending, Exception…).
 * Ink runs at 85% over the tint and one weight lighter than the T00 preview:
 * full-size on device, 700 saturated ink read too strong (owner, 18 Nov 2026).
 */
export function StatusPill({
  className,
  icon,
  label,
  size = "default",
  tone = "neutral",
}: {
  className?: string
  icon?: string
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
        icon && "gap-[4px]",
        className
      )}
    >
      {icon ? <Icon className={cn("size-xs", classes.text)} name={icon} /> : null}
      <Text
        className={cn("font-semibold", classes.text)}
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
