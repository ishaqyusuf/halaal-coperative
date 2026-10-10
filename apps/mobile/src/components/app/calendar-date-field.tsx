import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { formatDateOnly, parseDateOnly } from "@/lib/date-only"
import { cn } from "@/lib/utils"
import { Keyboard, Pressable } from "react-native"

export function CalendarDateField({
  accessibilityLabel,
  className,
  disabled = false,
  onPress,
  placeholder = "Choose date",
  precision = "date",
  testID,
  value,
}: {
  accessibilityLabel: string
  className?: string
  disabled?: boolean
  onPress: () => void
  placeholder?: string
  precision?: "date" | "month"
  testID?: string
  value: string
}) {
  const parts = value
    ? parseDateOnly(precision === "month" ? `${value.slice(0, 7)}-01` : value)
    : null
  const displayValue =
    parts && precision === "month"
      ? new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)))
      : parts
        ? formatDateOnly(value)
        : placeholder
  return (
    <Pressable
      accessibilityHint="Opens the calendar. The keyboard will not open."
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={cn(
        "min-h-12 w-full flex-row items-center justify-between gap-3 rounded-lg border border-input bg-card px-3 py-3 active:border-ring active:bg-accent/30",
        disabled && "opacity-50",
        className
      )}
      disabled={disabled}
      onPress={() => {
        Keyboard.dismiss()
        onPress()
      }}
      testID={testID}
    >
      <Text
        className={cn(
          "min-w-0 flex-1 text-base font-medium",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {displayValue}
      </Text>
      <Icon className="size-base text-brand" name="Calendar" />
    </Pressable>
  )
}
