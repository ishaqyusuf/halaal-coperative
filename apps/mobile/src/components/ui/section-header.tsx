import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

/**
 * "Your position ……… Statement" — 16/800 section title with an optional
 * trailing value (a total or count) or a primary text action.
 */
export function SectionHeader({
  action,
  className,
  title,
  value,
}: {
  action?: { label: string; onPress: () => void; accessibilityLabel?: string }
  className?: string
  title: string
  /** Muted trailing text such as "₦125,000" or "2". */
  value?: string
}) {
  return (
    <View
      className={cn("min-h-[44px] flex-row items-center justify-between gap-[12px]", className)}
    >
      <Text
        accessibilityRole="header"
        className="min-w-0 flex-1"
        numberOfLines={1}
        variant="section"
      >
        {title}
      </Text>
      {action ? (
        <Pressable
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          className="min-h-[44px] justify-center rounded-lg px-[4px]"
          haptic
          hitSlop={8}
          noRipple
          onPress={action.onPress}
        >
          <Text className="text-primary" variant="label">
            {action.label}
          </Text>
        </Pressable>
      ) : value ? (
        <Text
          className="text-muted-foreground"
          tabular
          variant="label"
        >
          {value}
        </Text>
      ) : null}
    </View>
  )
}
