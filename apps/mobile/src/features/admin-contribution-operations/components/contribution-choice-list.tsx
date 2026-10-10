import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Pressable, View } from "react-native"

export function ContributionChoiceList<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup">
      {options.map((option) => (
        <Pressable
          accessibilityLabel={option.label}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === option.value, disabled }}
          className="min-h-12 flex-row items-center gap-3 border-b border-border py-3"
          disabled={disabled}
          key={option.value}
          onPress={() => onChange(option.value)}
        >
          <Text
            className={`min-w-0 flex-1 text-sm font-semibold ${value === option.value ? "text-accent-foreground" : "text-foreground"}`}
          >
            {option.label}
          </Text>
          <Icon
            className={`size-base shrink-0 ${value === option.value ? "text-brand" : "text-muted-foreground"}`}
            name={value === option.value ? "CircleCheck" : "Circle"}
          />
        </Pressable>
      ))}
    </View>
  )
}
