import { AppSheet } from "@/components/app/app-sheet"
import { useFormFieldControl } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import * as Haptics from "expo-haptics"
import { useState } from "react"
import { Keyboard, View } from "react-native"

export type SelectOption<T extends string> = {
  value: T
  label: string
  description?: string
  disabled?: boolean
}

/** Shared trigger look for SelectField and DateField (52pt, radius 14). */
export function FieldTrigger({
  accessibilityHint,
  accessibilityLabel,
  disabled,
  icon,
  onPress,
  placeholder,
  testID,
  trailingIcon = "ChevronDown",
  value,
}: {
  accessibilityHint?: string
  accessibilityLabel?: string
  disabled?: boolean
  icon?: string
  onPress: () => void
  placeholder: string
  testID?: string
  trailingIcon?: string | null
  value?: string | null
}) {
  const field = useFormFieldControl()
  const largeText = useLargeTextLayout()
  const invalid = Boolean(field?.invalid)
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={
        accessibilityLabel ??
        `${field?.label ?? placeholder}${value ? `, ${value}` : ""}`
      }
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={cn(
        largeText ? "min-h-16" : "min-h-[52px]",
        "w-full flex-row items-center gap-3 rounded-[14px] border bg-card px-4",
        invalid ? "border-destructive" : "border-input",
        disabled && "opacity-50"
      )}
      disabled={disabled}
      haptic
      onPress={() => {
        Keyboard.dismiss()
        onPress()
      }}
      testID={testID}
    >
      {icon ? (
        <Icon className="size-base text-muted-foreground" name={icon} />
      ) : null}
      <Text
        className={cn(
          "min-w-0 flex-1",
          value ? "text-foreground" : "text-muted-foreground"
        )}
        numberOfLines={1}
        variant="body"
      >
        {value || placeholder}
      </Text>
      {trailingIcon ? (
        <Icon className="size-base text-muted-foreground" name={trailingIcon} />
      ) : null}
    </Pressable>
  )
}

/**
 * A select that opens a floating picker sheet (pickers always float, per
 * the sheet rule). Long lists scroll inside the sheet.
 */
export function SelectField<T extends string>({
  disabled,
  onChange,
  options,
  placeholder = "Choose",
  sheetTitle,
  testID,
  value,
}: {
  disabled?: boolean
  onChange: (value: T) => void
  options: readonly SelectOption<T>[]
  placeholder?: string
  sheetTitle?: string
  testID?: string
  value: T | null | undefined
}) {
  const field = useFormFieldControl()
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  const title = sheetTitle ?? field?.label ?? placeholder

  return (
    <>
      <FieldTrigger
        accessibilityHint="Opens a list of choices"
        disabled={disabled}
        onPress={() => setOpen(true)}
        placeholder={placeholder}
        testID={testID}
        value={selected?.label}
      />
      <AppSheet
        onClose={() => setOpen(false)}
        title={title}
        variant="picker"
        visible={open}
      >
        <View accessibilityRole="radiogroup" className="-mx-2">
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{
                  checked: isSelected,
                  disabled: option.disabled,
                }}
                className={cn(
                  "min-h-14 flex-row items-center gap-3 rounded-[14px] px-3 py-2",
                  isSelected ? "bg-accent" : "active:bg-muted",
                  option.disabled && "opacity-40"
                )}
                disabled={option.disabled}
                key={option.value}
                onPress={() => {
                  void Haptics.selectionAsync()
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className={cn(
                      "font-bold",
                      isSelected ? "text-accent-foreground" : "text-foreground"
                    )}
                    variant="body"
                  >
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text className="text-muted-foreground" variant="small">
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <Icon className="size-base text-accent-foreground" name="Check" />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </AppSheet>
    </>
  )
}
