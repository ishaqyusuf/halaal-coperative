import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import * as Haptics from "expo-haptics"
import { ScrollView, View } from "react-native"

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  /** Optional count shown after the label ("Ledger 34"). */
  count?: number | string
  accessibilityLabel?: string
  disabled?: boolean
}

/**
 * The one segmented control (02 Brand native): a raised track with a card
 * thumb. Replaces the per-screen lane/tab/filter copies. With more than
 * three options, or `scrollable`, the track scrolls horizontally.
 */
export function SegmentedControl<T extends string>({
  accessibilityLabel,
  className,
  onChange,
  options,
  scrollable,
  value,
}: {
  accessibilityLabel: string
  className?: string
  onChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  scrollable?: boolean
  value: T
}) {
  const shouldScroll = scrollable ?? options.length > 3
  const segments = options.map((option) => {
    const selected = option.value === value
    return (
      <Pressable
        accessibilityLabel={
          option.accessibilityLabel ??
          (option.count !== undefined
            ? `${option.label}, ${option.count}`
            : option.label)
        }
        accessibilityRole="tab"
        accessibilityState={{ disabled: option.disabled, selected }}
        className={cn(
          "min-h-9 flex-row items-center justify-center gap-1.5 rounded-[11px] px-3",
          shouldScroll ? "" : "flex-1",
          selected ? "bg-surface-float" : "bg-transparent",
          option.disabled && "opacity-40"
        )}
        disabled={option.disabled}
        key={option.value}
        noRipple
        onPress={() => {
          if (selected) return
          void Haptics.selectionAsync()
          onChange(option.value)
        }}
        style={
          selected
            ? { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.10)" }
            : undefined
        }
      >
        <Text
          className={selected ? "text-foreground" : "text-foreground-soft"}
          numberOfLines={1}
          variant="label"
        >
          {option.label}
        </Text>
        {option.count !== undefined ? (
          <Text
            className="text-muted-foreground"
            style={{ fontVariant: ["tabular-nums"] }}
            variant="caption"
          >
            {option.count}
          </Text>
        ) : null}
      </Pressable>
    )
  })

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      className={cn("rounded-[14px] bg-surface-raised p-[3px]", className)}
    >
      {shouldScroll ? (
        <ScrollView
          contentContainerClassName="gap-0.5"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {segments}
        </ScrollView>
      ) : (
        <View className="flex-row gap-0.5">{segments}</View>
      )}
    </View>
  )
}
